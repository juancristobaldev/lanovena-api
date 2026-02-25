import { ObjectType, Field, ID, InputType, Int } from '@nestjs/graphql';

@ObjectType()
export class NoticeEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  summary: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  image?: string;

  @Field()
  status: string;

  @Field(() => Int)
  views: number;

  @Field()
  schoolId: string;

  @Field()
  createdAt: Date;
}

@InputType()
export class CreateNoticeInput {
  @Field()
  schoolId: string;

  @Field()
  title: string;

  @Field()
  summary: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  image?: string;

  @Field({ defaultValue: 'draft' })
  status: string;
}

@InputType()
export class UpdateNoticeInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  summary?: string;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  status?: string;
}
