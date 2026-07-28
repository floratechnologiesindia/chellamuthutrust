import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const uuidField = { type: String, default: uuidv4 };
const timestamps = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } };

export interface IHomeEvent {
  _id: string;
  home_id: string;
  trust_id: string;
  title: string;
  event_type: string;
  event_date: string;
  description?: string;
  photo_urls?: string[];
  status: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

const homeEventSchema = new Schema<IHomeEvent>({
  _id: uuidField,
  home_id: { type: String, required: true, index: true },
  trust_id: { type: String, required: true, index: true },
  title: { type: String, required: true },
  event_type: { type: String, default: 'celebration' },
  event_date: { type: String, required: true },
  description: String,
  photo_urls: [String],
  status: { type: String, default: 'DRAFT', index: true },
  created_by: String,
}, timestamps);

export const HomeEvent = mongoose.model<IHomeEvent>('HomeEvent', homeEventSchema);

export interface ICaseStudy {
  _id: string;
  home_id: string;
  trust_id: string;
  title: string;
  resident_name?: string;
  summary: string;
  story?: string;
  photo_urls?: string[];
  status: string;
  created_by?: string;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const caseStudySchema = new Schema<ICaseStudy>({
  _id: uuidField,
  home_id: { type: String, required: true, index: true },
  trust_id: { type: String, required: true, index: true },
  title: { type: String, required: true },
  resident_name: String,
  summary: { type: String, required: true },
  story: String,
  photo_urls: [String],
  status: { type: String, default: 'DRAFT', index: true },
  created_by: String,
  published_at: Date,
}, timestamps);

export const CaseStudy = mongoose.model<ICaseStudy>('CaseStudy', caseStudySchema);
