import { HotColumnProps } from "@handsontable/react";
import { SelectField, TextField } from "common-ui";
import titleCase from "title-case";
import { useDinaIntl } from "../../../../intl/dina-ui-intl";
import { DefaultValueRule } from "./model-types";

export interface DefaultValueRuleEditorRowProps {
  index: number;
  rule: DefaultValueRule;
  targetFields: HotColumnProps[];
  onAddClick: () => void;
  onRemoveClick: () => void;
}

export function DefaultValueRuleEditorRow({
  index,
  rule,
  targetFields,
  onAddClick,
  onRemoveClick
}: DefaultValueRuleEditorRowProps) {
  const { formatMessage } = useDinaIntl();

  const targetFieldOptions = targetFields.map(({ title, data }) => ({
    label: String(title),
    value: data
  }));

  const sourceTypeOptions = ["text", "objectUploadField"].map(sourceType => ({
    label: formatMessage(sourceType as any).trim() || titleCase(sourceType),
    value: sourceType
  }));

  const objectUploadFieldOptions = OBJECT_UPLOAD_FIELDS.map(field => ({
    label: formatMessage(`field_${field}` as any).trim() || titleCase(field),
    value: field
  }));

  const fieldPrefix = `defaultValueRules.${index}`;

  return (
    <div className="list-inline">
      <div className="list-inline-item">Set</div>
      <div className="list-inline-item" style={{ width: "16rem" }}>
        <SelectField
          name={`${fieldPrefix}.targetField`}
          options={targetFieldOptions}
          label={formatMessage("targetField")}
        />
      </div>
      <div className="list-inline-item">To</div>
      <div className="list-inline-item" style={{ width: "16rem" }}>
        <SelectField
          name={`${fieldPrefix}.source.type`}
          options={sourceTypeOptions}
          label={formatMessage("valueSourceType")}
        />
      </div>
      <div className="list-inline-item">:</div>
      {rule.source.type === "text" && (
        <div className="list-inline-item" style={{ width: "16rem" }}>
          <TextField
            name={`${fieldPrefix}.source.text`}
            label={formatMessage("sourceText")}
          />
        </div>
      )}
      {rule.source.type === "objectUploadField" && (
        <div className="list-inline-item" style={{ width: "16rem" }}>
          <SelectField
            name={`${fieldPrefix}.source.field`}
            options={objectUploadFieldOptions}
            label={formatMessage("sourceField")}
          />
        </div>
      )}
      <div className="list-inline-item">
        <button className="btn btn-primary" type="button" onClick={onAddClick}>
          +
        </button>
      </div>
      <div className="list-inline-item">
        <button
          className="btn btn-primary"
          type="button"
          onClick={onRemoveClick}
        >
          -
        </button>
      </div>
    </div>
  );
}

const OBJECT_UPLOAD_FIELDS = [
  "bucket",
  "createdBy",
  "createdOn",
  "dateTimeDigitized",
  "dcType",
  "detectedFileExtension",
  "detectedMediaType",
  "evaluatedFileExtension",
  "evaluatedMediaType",
  "originalFilename",
  "receivedMediaType",
  "sha1Hex",
  "sizeInBytes",
  "thumbnailIdentifier"
];
