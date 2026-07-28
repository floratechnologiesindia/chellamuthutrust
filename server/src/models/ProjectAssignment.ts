import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IProjectAssignment {
  _id: string;
  user_id: string;
  home_id: string;
  trust_id: string;
  is_primary: boolean;
  assigned_by?: string;
  assigned_at: Date;
  created_at: Date;
  updated_at: Date;
}

const projectAssignmentSchema = new Schema<IProjectAssignment>(
  {
    _id: { type: String, default: uuidv4 },
    user_id: { type: String, required: true, index: true },
    home_id: { type: String, required: true, index: true },
    trust_id: { type: String, required: true, index: true },
    is_primary: { type: Boolean, default: false },
    assigned_by: String,
    assigned_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

projectAssignmentSchema.index({ user_id: 1, home_id: 1 }, { unique: true });
projectAssignmentSchema.index({ home_id: 1, is_primary: 1 });

projectAssignmentSchema.virtual('id').get(function () {
  return this._id;
});

export const ProjectAssignment = mongoose.model<IProjectAssignment>(
  'ProjectAssignment',
  projectAssignmentSchema,
);
