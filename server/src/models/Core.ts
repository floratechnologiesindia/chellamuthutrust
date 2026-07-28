import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const uuidField = { type: String, default: uuidv4 };
const timestamps = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } };

export interface ITrust { _id: string; name: string; registration_number?: string; description?: string; address: string; city: string; state: string; country: string; pincode: string; contact_phone: string; contact_email: string; image_url?: string; created_by?: string; created_at: Date; updated_at: Date; }

const trustSchema = new Schema<ITrust>({
  _id: uuidField, name: { type: String, required: true }, registration_number: String, description: String,
  address: { type: String, required: true }, city: { type: String, required: true }, state: { type: String, required: true },
  country: { type: String, default: 'India' }, pincode: { type: String, required: true },
  contact_phone: { type: String, required: true }, contact_email: { type: String, required: true },
  image_url: String, created_by: String,
}, timestamps);

export const Trust = mongoose.model<ITrust>('Trust', trustSchema);

export interface IHome {
  _id: string; trust_id: string; name: string; type: string; description?: string; address: string; city: string; state: string;
  country: string; pincode: string; capacity_children_male?: number; capacity_children_female?: number;
  capacity_elderly_male?: number; capacity_elderly_female?: number; primary_warden_id?: string; image_url?: string;
  year_established?: number; supported_by?: string; contact_details?: string; facilities?: string;
  created_at: Date; updated_at: Date;
}

const homeSchema = new Schema<IHome>({
  _id: uuidField, trust_id: { type: String, required: true, index: true }, name: { type: String, required: true },
  type: { type: String, required: true }, description: String, address: { type: String, required: true },
  city: { type: String, required: true }, state: { type: String, required: true }, country: { type: String, default: 'India' },
  pincode: { type: String, required: true }, capacity_children_male: Number, capacity_children_female: Number,
  capacity_elderly_male: Number, capacity_elderly_female: Number, primary_warden_id: String, image_url: String,
  year_established: Number, supported_by: String, contact_details: String, facilities: String,
}, timestamps);

export const Home = mongoose.model<IHome>('Home', homeSchema);

export interface IResident {
  _id: string; home_id: string; name: string; age: number; gender: string; category: string; special_needs?: string;
  photo_url?: string; status: string; admission_date?: string; discharge_date?: string;
  created_at: Date; updated_at: Date;
}

const residentSchema = new Schema<IResident>({
  _id: uuidField, home_id: { type: String, required: true, index: true }, name: { type: String, required: true },
  age: { type: Number, required: true }, gender: { type: String, required: true }, category: { type: String, required: true },
  special_needs: String, photo_url: String, status: { type: String, default: 'active' },
  admission_date: String, discharge_date: String,
}, timestamps);

export const Resident = mongoose.model<IResident>('Resident', residentSchema);

export interface IHomePhoto {
  _id: string; home_id: string; image_url: string; caption?: string; sort_order: number; is_primary?: boolean; created_at: Date;
}

const homePhotoSchema = new Schema<IHomePhoto>({
  _id: uuidField, home_id: { type: String, required: true, index: true }, image_url: { type: String, required: true },
  is_primary: { type: Boolean, default: false },
  caption: String, sort_order: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const HomePhoto = mongoose.model<IHomePhoto>('HomePhoto', homePhotoSchema);

export interface IHomeType { _id: string; key: string; label: string; description?: string; icon?: string; sort_order: number; is_active: boolean; created_at: Date; }
const homeTypeSchema = new Schema<IHomeType>({ _id: uuidField, key: { type: String, unique: true }, label: String, description: String, icon: String, sort_order: Number, is_active: { type: Boolean, default: true } }, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const HomeType = mongoose.model<IHomeType>('HomeType', homeTypeSchema);

export interface IDonorCategory { _id: string; key: string; label: string; description?: string; color?: string; sort_order: number; is_active: boolean; created_at: Date; }
const donorCategorySchema = new Schema<IDonorCategory>({ _id: uuidField, key: { type: String, unique: true }, label: String, description: String, color: String, sort_order: Number, is_active: { type: Boolean, default: true } }, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const DonorCategory = mongoose.model<IDonorCategory>('DonorCategory', donorCategorySchema);

export interface IReligion { _id: string; key: string; label: string; description?: string; sort_order: number; is_active: boolean; created_at: Date; }
const religionSchema = new Schema<IReligion>({ _id: uuidField, key: { type: String, unique: true }, label: { type: String, required: true }, description: String, sort_order: Number, is_active: { type: Boolean, default: true } }, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const Religion = mongoose.model<IReligion>('Religion', religionSchema);
