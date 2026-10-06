"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw, Save } from "lucide-react";
import FormField from "@/components/FormField";
import type { AppraisalFormData, FieldMetaMap } from "@/types/appraisal";

type FormPage = 1 | 2;
type FieldType = "text" | "number" | "date" | "textarea" | "select";

type AppraisalFormProps = {
  data: AppraisalFormData;
  meta: FieldMetaMap;
  page: FormPage;
  review?: boolean;
  onChange: (name: keyof AppraisalFormData, value: string) => void;
  onSave: () => Promise<boolean>;
  onClear: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onBackToUpload: () => void;
  saving: boolean;
};

type FieldDefinition = {
  name: keyof AppraisalFormData;
  label: string;
  type?: FieldType;
  options?: ReadonlyArray<{ label: string; value: string }>;
  placeholder?: string;
  prefix?: string;
  className?: string;
  render?: "priceRange";
};

type SectionDefinition = {
  title: string;
  fields: readonly FieldDefinition[];
};

const states = [
  ["Alabama", "AL"], ["Alaska", "AK"], ["Arizona", "AZ"], ["Arkansas", "AR"],
  ["California", "CA"], ["Colorado", "CO"], ["Connecticut", "CT"], ["Delaware", "DE"],
  ["Florida", "FL"], ["Georgia", "GA"], ["Hawaii", "HI"], ["Idaho", "ID"],
  ["Illinois", "IL"], ["Indiana", "IN"], ["Iowa", "IA"], ["Kansas", "KS"],
  ["Kentucky", "KY"], ["Louisiana", "LA"], ["Maine", "ME"], ["Maryland", "MD"],
  ["Massachusetts", "MA"], ["Michigan", "MI"], ["Minnesota", "MN"], ["Mississippi", "MS"],
  ["Missouri", "MO"], ["Montana", "MT"], ["Nebraska", "NE"], ["Nevada", "NV"],
  ["New Hampshire", "NH"], ["New Jersey", "NJ"], ["New Mexico", "NM"], ["New York", "NY"],
  ["North Carolina", "NC"], ["North Dakota", "ND"], ["Ohio", "OH"], ["Oklahoma", "OK"],
  ["Oregon", "OR"], ["Pennsylvania", "PA"], ["Rhode Island", "RI"], ["South Carolina", "SC"],
  ["South Dakota", "SD"], ["Tennessee", "TN"], ["Texas", "TX"], ["Utah", "UT"],
  ["Vermont", "VT"], ["Virginia", "VA"], ["Washington", "WA"], ["West Virginia", "WV"],
  ["Wisconsin", "WI"], ["Wyoming", "WY"], ["District of Columbia", "DC"],
].map(([label, value]) => ({ label, value }));

const propertyTypeOptions = [
  "Single-Family Residential", "Condominium", "Townhouse", "2-4 Unit Residential",
  "Multifamily", "Commercial", "Land", "Other",
].map((value) => ({ label: value, value }));

const assignmentTypeOptions = [
  "Purchase Transaction", "Refinance Transaction", "Other Transaction", "Other",
].map((value) => ({ label: value, value }));

const intendedUseOptions = [
  "Mortgage financing", "Purchase or sale decision", "Estate planning",
  "Tax assessment appeal", "Litigation", "Other",
].map((value) => ({ label: value, value }));

const dateOfSalesOptions = [
  "Most recent 3 months", "3-6 months ago", "6-12 months ago", "More than 12 months ago",
].map((value) => ({ label: value, value }));

const valueAsIsOptions = ["As Is", "Subject to repairs", "Subject to completion"].map((value) => ({ label: value, value }));
const timeOptions = ["Less than 3 months", "3-6 months", "6-12 months", "More than 12 months"].map((value) => ({ label: value, value }));

const pageOneSections: readonly SectionDefinition[] = [
  {
    title: "Property Information",
    fields: [
      { name: "propertyAddress", label: "Property Address", className: "sm:col-span-2" },
      { name: "city", label: "City" },
      { name: "state", label: "State", type: "select", options: states },
      { name: "zipCode", label: "ZIP Code" },
      { name: "county", label: "County" },
      { name: "legalDescription", label: "Legal Description", type: "textarea", className: "sm:col-span-2" },
      { name: "propertyType", label: "Property Type", type: "select", options: propertyTypeOptions },
      { name: "taxId", label: "Tax ID / Parcel Number" },
      { name: "yearBuilt", label: "Year Built", type: "number" },
      { name: "grossLivingArea", label: "Gross Living Area (sq ft)", type: "number" },
      { name: "bedrooms", label: "Bedrooms", type: "number" },
      { name: "bathrooms", label: "Bathrooms", type: "number" },
      { name: "stories", label: "Stories", type: "number" },
      { name: "basement", label: "Basement" },
      { name: "garage", label: "Garage" },
      { name: "heating", label: "Heating" },
      { name: "cooling", label: "Cooling" },
      { name: "lotSize", label: "Lot Size" },
      { name: "zoning", label: "Zoning" },
      { name: "floodZone", label: "Flood Zone" },
      { name: "annualTaxes", label: "Annual Taxes", type: "number", prefix: "$" },
    ],
  },
  {
    title: "Client Information",
    fields: [
      { name: "clientName", label: "Client Name" },
      { name: "clientAddress", label: "Client Address", type: "textarea", className: "sm:col-span-2" },
      { name: "appraiserName", label: "Appraiser Name" },
      { name: "appraiserLicense", label: "License Number" },
      { name: "effectiveDate", label: "Effective Date of Appraisal", type: "date" },
      { name: "intendedUse", label: "Intended Use", type: "select", options: intendedUseOptions },
      { name: "intendedUser", label: "Intended User" },
      { name: "lender", label: "Lender" },
      { name: "borrowerName", label: "Borrower Name" },
      { name: "ownerOfPublicRecord", label: "Owner of Public Record" },
      { name: "assignmentType", label: "Assignment Type", type: "select", options: assignmentTypeOptions },
      { name: "orderDate", label: "Order Date", type: "date" },
      { name: "dueDate", label: "Due Date", type: "date" },
    ],
  },
  {
    title: "Contract Information",
    fields: [
      { name: "contractPrice", label: "Contract Price", type: "number", prefix: "$" },
      { name: "contractDate", label: "Contract Date", type: "date" },
      { name: "sellerName", label: "Seller Name" },
      { name: "listPrice", label: "List Price", type: "number", prefix: "$" },
      { name: "daysOnMarket", label: "Days on Market", type: "number" },
      { name: "mlsNumber", label: "MLS Number" },
      { name: "sellerConcessions", label: "Seller Concessions", type: "number", prefix: "$" },
      { name: "priorSaleDate", label: "Prior Sale Date", type: "date" },
      { name: "priorSalePrice", label: "Prior Sale Price", type: "number", prefix: "$" },
    ],
  },
];

const pageTwoSections: readonly SectionDefinition[] = [
  {
    title: "Sales Comparison Approach",
    fields: [
      { name: "numberOfComparableSales", label: "No. of Comparable Sales", type: "number" },
      { name: "priceRangeLow", label: "Price Range", render: "priceRange", placeholder: "e.g. $200,000 - $300,000", className: "sm:col-span-1" },
      { name: "dateOfSales", label: "Date of Sales", type: "select", options: dateOfSalesOptions },
      { name: "adjustmentsApplied", label: "Adjustments Applied", type: "textarea", className: "sm:col-span-2" },
    ],
  },
  {
    title: "Cost Approach",
    fields: [
      { name: "landValue", label: "Land Value", type: "number", prefix: "$" },
      { name: "improvementValue", label: "Improvement Value", type: "number", prefix: "$" },
      { name: "totalDepreciation", label: "Total Depreciation", type: "number", prefix: "$" },
      { name: "indicatedValueByCost", label: "Indicated Value", type: "number", prefix: "$" },
    ],
  },
  {
    title: "Reconciliation",
    fields: [
      { name: "finalOpinionOfValue", label: "Final Opinion of Value", type: "number", prefix: "$" },
      { name: "valueAsIs", label: "Value As Is", type: "select", options: valueAsIsOptions },
      { name: "valueAsCompleted", label: "Value As Completed", type: "number", prefix: "$" },
      { name: "exposureTime", label: "Exposure Time", type: "select", options: timeOptions },
      { name: "marketingTime", label: "Marketing Time", type: "select", options: timeOptions },
      { name: "additionalComments", label: "Additional Comments", type: "textarea", className: "sm:col-span-2" },
    ],
  },
];

const buttonBase = "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export default function AppraisalForm({
  data,
  meta,
  page,
  review = false,
  onChange,
  onSave,
  onClear,
  onNext,
  onPrevious,
  onBackToUpload,
  saving,
}: AppraisalFormProps) {
  const sections = page === 1 ? pageOneSections : pageTwoSections;
  const title = review ? "Form Auto-Filled – Page 1" : `Editable Form – Page ${page}`;
  const subtitle = review ? "Review, edit if needed, and save" : "Manually enter or edit the information";

  async function saveAndContinue() {
    if (await onSave()) onNext();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
      className="overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_8px_28px_rgba(27,53,91,0.07)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7edf5] px-5 py-5 sm:px-7">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3150]">{title}</h2>
          <p className="mt-1 text-sm text-[#6c7b91]">{subtitle}</p>
        </div>
        {review && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-semibold text-[#23824c]">
            <Check aria-hidden="true" className="size-3.5" />
            AI Filled
          </span>
        )}
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
        {page === 1 && (
          <div>
            <h3 className="mb-1 text-base font-semibold text-[#1e3150]">Uniform Residential Appraisal Report (UAD 3.6)</h3>
            <p className="text-sm text-[#718097]">Property and assignment information</p>
          </div>
        )}
        {sections.map((section) => (
          <section key={section.title} className="border-t border-[#e9eef5] pt-5 first:border-0 first:pt-0">
            <h3 className="mb-4 text-sm font-semibold text-[#28456d]">{section.title}</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.name} className={field.className}>
                  {field.render === "priceRange" ? (
                    <FormField
                      label={field.label}
                      name="priceRangeLow"
                      value={[data.priceRangeLow, data.priceRangeHigh].filter(Boolean).join(" - ")}
                      placeholder={field.placeholder}
                      type="text"
                      meta={meta.priceRangeLow}
                      onChange={(_, value) => {
                        const [low = "", high = ""] = value.split(/\s+-\s+/, 2);
                        onChange("priceRangeLow", low);
                        onChange("priceRangeHigh", high);
                      }}
                    />
                  ) : (
                    <FormField
                      label={field.label}
                      name={field.name}
                      value={data[field.name]}
                      onChange={(_, value) => onChange(field.name, value)}
                      type={field.type ?? "text"}
                      options={field.options}
                      placeholder={field.placeholder}
                      prefix={field.prefix}
                      meta={meta[field.name]}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edf5] bg-[#fbfcfe] px-5 py-4 sm:px-7">
        {page === 1 && !review && (
          <button
            type="button"
            onClick={onClear}
            className={`${buttonBase} border border-[#cdd7e5] bg-white text-[#40536e] hover:bg-[#f5f8fc] focus-visible:ring-[#7892b6]`}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Clear Form
          </button>
        )}
        {page === 2 && (
          <button
            type="button"
            onClick={onPrevious}
            className={`${buttonBase} border border-[#cdd7e5] bg-white text-[#40536e] hover:bg-[#f5f8fc] focus-visible:ring-[#7892b6]`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Previous
          </button>
        )}
        {review && (
          <button
            type="button"
            onClick={onBackToUpload}
            className={`${buttonBase} border border-[#cdd7e5] bg-white text-[#40536e] hover:bg-[#f5f8fc] focus-visible:ring-[#7892b6]`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Upload
          </button>
        )}
        <span className="flex-1" />
        {review ? (
          <button type="submit" disabled={saving} className={`${buttonBase} bg-[#2168d5] text-white shadow-sm hover:bg-[#1757bb] focus-visible:ring-[#2168d5] disabled:opacity-60`}>
            <Save aria-hidden="true" className="size-4" />
            {saving ? "Saving..." : "Save Form"}
          </button>
        ) : (
          <button type="button" onClick={() => void saveAndContinue()} disabled={saving} className={`${buttonBase} bg-[#2168d5] text-white shadow-sm hover:bg-[#1757bb] focus-visible:ring-[#2168d5] disabled:opacity-60`}>
            <span>{saving ? "Saving..." : "Save & Next"}</span>
            {!saving && <ArrowRight aria-hidden="true" className="size-4" />}
          </button>
        )}
      </footer>
    </form>
  );
}
