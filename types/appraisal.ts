import { z } from "zod";

const appraisalFields = {
  propertyAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  county: z.string(),
  legalDescription: z.string(),
  taxId: z.string(),
  propertyType: z.string(),
  yearBuilt: z.string(),
  grossLivingArea: z.string(),
  bedrooms: z.string(),
  bathrooms: z.string(),
  stories: z.string(),
  basement: z.string(),
  garage: z.string(),
  heating: z.string(),
  cooling: z.string(),
  lotSize: z.string(),
  zoning: z.string(),
  floodZone: z.string(),
  annualTaxes: z.string(),
  clientName: z.string(),
  clientAddress: z.string(),
  lender: z.string(),
  borrowerName: z.string(),
  ownerOfPublicRecord: z.string(),
  appraiserName: z.string(),
  appraiserLicense: z.string(),
  effectiveDate: z.string(),
  intendedUse: z.string(),
  intendedUser: z.string(),
  assignmentType: z.string(),
  orderDate: z.string(),
  dueDate: z.string(),
  contractPrice: z.string(),
  contractDate: z.string(),
  sellerName: z.string(),
  listPrice: z.string(),
  daysOnMarket: z.string(),
  mlsNumber: z.string(),
  sellerConcessions: z.string(),
  priorSaleDate: z.string(),
  priorSalePrice: z.string(),
  numberOfComparableSales: z.string(),
  priceRangeLow: z.string(),
  priceRangeHigh: z.string(),
  dateOfSales: z.string(),
  adjustmentsApplied: z.string(),
  landValue: z.string(),
  improvementValue: z.string(),
  totalDepreciation: z.string(),
  indicatedValueByCost: z.string(),
  finalOpinionOfValue: z.string(),
  valueAsIs: z.string(),
  valueAsCompleted: z.string(),
  exposureTime: z.string(),
  marketingTime: z.string(),
  additionalComments: z.string(),
};

export const appraisalSchema = z.strictObject(appraisalFields);

export type AppraisalFormData = z.infer<typeof appraisalSchema>;

export const FIELD_KEYS = Object.keys(appraisalFields) as (keyof AppraisalFormData)[];

export type FieldMeta = {
  confidence: number;
  source: string;
  aiFilled: boolean;
  edited: boolean;
};

export type FieldMetaMap = Partial<Record<keyof AppraisalFormData, FieldMeta>>;

const fieldMetaSchema = z.strictObject({
  confidence: z.number().min(0).max(1),
  source: z.string(),
  aiFilled: z.boolean(),
  edited: z.boolean(),
});

export const fieldMetaMapSchema = z
  .object(Object.fromEntries(FIELD_KEYS.map((key) => [key, fieldMetaSchema.optional()])))
  .partial()
  .strict();

export const appraisalSaveSchema = z.union([
  appraisalSchema,
  z.strictObject({
    data: appraisalSchema,
    meta: fieldMetaMapSchema.optional(),
  }),
]);

export type ExtractionResult = {
  data: Partial<Record<keyof AppraisalFormData, string | null>>;
  meta: Record<string, { confidence: number; source: string }>;
};