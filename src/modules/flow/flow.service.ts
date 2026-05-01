// src/modules/flow/flow.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { URLSearchParams } from 'url';

export class FlowApiException extends BadRequestException {
  constructor(
    public readonly flowCode: number | string | undefined,
    public readonly flowMessage: string,
    public readonly endpoint: string,
  ) {
    super(`Flow ${endpoint}: [${flowCode ?? 'unknown'}] ${flowMessage}`);
  }
}

@Injectable()
export class FlowService {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly apiUrl: string;
  private readonly logger = new Logger(FlowService.name);

  constructor(private readonly httpService: HttpService) {
    this.apiKey = process.env.FLOW_API_KEY || '';
    this.secretKey = process.env.FLOW_SECRET_KEY || '';
    this.apiUrl = process.env.FLOW_API_URL || '';
  }

  /* ======================================================
     FIRMA
  ====================================================== */
  private signParams(params: Record<string, any>): string {
    const keys = Object.keys(params).sort();
    let raw = '';
    for (const key of keys) raw += `${key}${params[key]}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(raw)
      .digest('hex');
  }

  /* ======================================================
     REQUEST
  ====================================================== */
  private async sendRequest(
    endpoint: string,
    params: Record<string, any>,
    method: 'post' | 'get' = 'post',
  ) {
    const cleanedParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    );

    const s = this.signParams(cleanedParams);
    const body = new URLSearchParams({ ...cleanedParams, s });

    try {
      const url = `${this.apiUrl}${endpoint}`;
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: method === 'get' ? `${url}?${body}` : url,
          data: method === 'post' ? body : undefined,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return response.data;
    } catch (err: any) {
      const flowError = err.response?.data;
      this.logger.error(endpoint, flowError || err.message);

      if (flowError?.code || flowError?.message) {
        throw new FlowApiException(
          flowError?.code,
          flowError?.message || 'Flow API error',
          endpoint,
        );
      }

      throw new BadRequestException('Error comunicándose con Flow');
    }
  }

  /* ======================================================
     PAGOS ÚNICOS
  ====================================================== */
  async deletePlan(flowPlanId: string): Promise<void> {
    await this.sendRequest('/subscription/delete', {
      apiKey: this.apiKey,
      planId: flowPlanId,
    });

    this.logger.log(`Plan Flow eliminado: ${flowPlanId}`);
  }
  async createPayment(params: {
    commerceOrder: string;
    subject: string;
    amount: number;
    email: string;
    currency?: 'CLP';
    urlConfirmation: string;
    urlReturn: string;
  }) {
    const response = await this.sendRequest('/payment/create', {
      apiKey: this.apiKey,
      commerceOrder: params.commerceOrder,
      subject: params.subject,
      currency: params.currency ?? 'CLP',
      amount: params.amount,
      email: params.email,
      urlConfirmation: params.urlConfirmation,
      urlReturn: params.urlReturn,
    });

    return {
      token: response.token,
      redirectUrl: `${response.url}?token=${response.token}`,
      flowOrder: response.flowOrder,
    };
  }
  isSubscriptionPayment(status: any): boolean {
    return !!status.subscriptionId;
  }

  async getPayment(token: string) {
    return this.getPaymentStatus(token);
  }

  async getPaymentStatus(token: string) {
    return this.sendRequest(
      '/payment/getStatus',
      { apiKey: this.apiKey, token },
      'get',
    );
  }

  /* ======================================================
     CLIENTES
  ====================================================== */

  async createCustomer(name: string, email: string, externalId: string) {
    return this.sendRequest('/customer/create', {
      apiKey: this.apiKey,
      name,
      email,
      externalId,
    });
  }

  extractCustomerId(customerPayload: any): string | null {
    const rawId = customerPayload?.customerId ?? customerPayload?.id ?? null;
    if (!rawId) {
      return null;
    }

    const customerId = String(rawId).trim();
    return customerId.length > 0 ? customerId : null;
  }

  async registerCustomerCard(customerId: string) {
    const urlReturn =
      process.env.FLOW_REGISTER_RETURN_URL ||
      `${process.env.ENDPOINT_API || 'http://localhost:4000'}/flow/hooks/card-return`;

    const response = await this.sendRequest('/customer/register', {
      apiKey: this.apiKey,
      customerId,
      url_return: urlReturn,
    });

    return {
      token: response.token,
      redirectUrl: `${response.url}?token=${response.token}`,
    };
  }

  async getRegisterStatus(token: string) {
    return this.sendRequest(
      '/customer/getRegisterStatus',
      { apiKey: this.apiKey, token },
      'get',
    );
  }

  /* ======================================================
     PLANES
  ====================================================== */

  async createPlan(params: {
    planId: string;
    name: string;
    amount: number;
    interval: 1 | 2 | 3 | 4;
    intervalCount?: number;
    trialDays?: number;
    periodsNumber?: number;
    urlCallback?: string;
  }) {
    return this.sendRequest('/plans/create', {
      apiKey: this.apiKey,
      planId: params.planId,
      name: params.name,
      currency: 'CLP',
      amount: params.amount,
      interval: params.interval,
      interval_count: params.intervalCount ?? 1,
      trial_period_days: params.trialDays ?? 0,
      periods_number: params.periodsNumber ?? 0,
      urlCallback: params.urlCallback,
    });
  }

  async getPlan(planId: string) {
    return this.sendRequest(
      '/plans/get',
      { apiKey: this.apiKey, planId },
      'get',
    );
  }

  /* ======================================================
     SUSCRIPCIONES
  ====================================================== */

  async createSubscription(params: {
    customerId: string;
    planId: string;
    couponId?: number;
    trialDays?: number;
    periodsNumber?: number;
  }) {
    return this.sendRequest('/subscription/create', {
      apiKey: this.apiKey,
      customerId: params.customerId,
      planId: params.planId,
      couponId: params.couponId,
      trial_period_days: params.trialDays,
      periods_number: params.periodsNumber,
    });
  }

  async getSubscription(subscriptionId: string) {
    return this.sendRequest(
      '/subscription/get',
      { apiKey: this.apiKey, subscriptionId },
      'get',
    );
  }

  async cancelSubscription(subscriptionId: string) {
    return this.sendRequest('/subscription/cancel', {
      apiKey: this.apiKey,
      subscriptionId,
    });
  }

  async deleteCustomer(customerId: string) {
    return this.sendRequest('/customer/delete', {
      apiKey: this.apiKey,
      customerId,
    });
  }
}
