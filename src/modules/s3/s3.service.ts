import { Injectable, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

type StoredFile = {
  buffer: Buffer;
  contentType?: string;
};

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bucket = process.env.AWS_S3_BUCKET!;
  }

  async uploadFile(file: Express.Multer.File) {
    const key = `${Date.now()}-${randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3.send(command);

    return {
      url: `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key,
    };
  }

  // 📥 Obtener archivo
  async getFile(key: string): Promise<Buffer> {
    const file = await this.getFileWithMeta(key);
    return file.buffer;
  }

  async getFileWithMeta(key: string): Promise<StoredFile> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3.send(command);

      const stream = response.Body as Readable;
      const buffer = await this.streamToBuffer(stream);

      return {
        buffer,
        contentType: response.ContentType,
      };
    } catch (error) {
      throw new NotFoundException('Archivo no encontrado en S3');
    }
  }

  // 🗑️ Eliminar archivo
  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);

    return {
      message: 'Archivo eliminado correctamente',
      key,
    };
  }

  // 🔧 Helper: stream → buffer
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
