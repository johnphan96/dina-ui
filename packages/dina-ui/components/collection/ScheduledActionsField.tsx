import {
  DateField,
  DinaForm,
  DinaFormSection,
  FieldSet,
  FormikButton,
  OnFormikSubmit,
  TextField,
  useDinaFormContext
} from "common-ui";
import { FastField, FormikContextType } from "formik";
import { isEmpty } from "lodash";
import { Fragment, useState } from "react";
import ReactTable, { CellInfo, Column } from "react-table";
import * as yup from "yup";
import { UserSelectField } from "..";
import { DinaMessage, useDinaIntl } from "../../intl/dina-ui-intl";
import { ScheduledAction } from "../../types/collection-api";

/** Type-safe object with all ScheduledAction fields. */
export const SCHEDULEDACTION_FIELDS_OBJECT: Required<
  Record<keyof ScheduledAction, true>
> = {
  actionStatus: true,
  actionType: true,
  assignedTo: true,
  date: true,
  remarks: true
};

/** All fields of the ScheduledAction type. */
export const SCHEDULEDACTION_FIELDS = Object.keys(
  SCHEDULEDACTION_FIELDS_OBJECT
);

export const scheduledActionSchema = yup.object({
  actionStatus: yup.string().required(),
  actionType: yup.string().required()
});

export interface ScheduledActionsFieldProps {
  className?: string;
}

export function ScheduledActionsField({
  className
}: ScheduledActionsFieldProps) {
  const fieldName = "scheduledActions";

  const { readOnly } = useDinaFormContext();
  const { formatMessage } = useDinaIntl();

  const [actionToEdit, setActionToEdit] = useState<
    "NEW" | { index: number; viewIndex: number } | null
  >(null);

  const isEditing = !!actionToEdit;

  function openRowEditor(row: CellInfo) {
    setActionToEdit({ index: row.index, viewIndex: row.viewIndex });
  }

  function removeAction(
    formik: FormikContextType<ScheduledAction>,
    index: number
  ) {
    setActionToEdit(null);
    const scheduledActions =
      formik.getFieldMeta<ScheduledAction[]>(fieldName).value ?? [];
    // Remove the item at the index:
    formik.setFieldValue(fieldName, [
      ...scheduledActions.slice(0, index),
      ...scheduledActions.slice(index + 1)
    ]);
  }

  const buttonProps = () => ({ disabled: isEditing, style: { width: "7rem" } });

  const actionColumns: Column[] = [
    { accessor: "actionType", Header: formatMessage("actionType") },
    { accessor: "date", Header: formatMessage("date") },
    { accessor: "actionStatus", Header: formatMessage("status") },
    {
      accessor: "assignedTo",
      Header: formatMessage("assignedTo"),
      Cell: row => (
        <DinaFormSection readOnly={true}>
          <UserSelectField
            name={`${fieldName}[${row.index}].assignedTo`}
            removeLabel={true}
          />
        </DinaFormSection>
      )
    },
    { accessor: "remarks", Header: formatMessage("remarks") },
    ...(readOnly
      ? []
      : [
          {
            Cell: row => (
              <div className={`d-flex gap-3 index-${row.index}`}>
                <FormikButton
                  className="btn btn-primary mb-3 edit-button"
                  buttonProps={buttonProps}
                  onClick={() => openRowEditor(row)}
                >
                  <DinaMessage id="editButtonText" />
                </FormikButton>
                <FormikButton
                  className="btn btn-danger mb-3 remove-button"
                  buttonProps={buttonProps}
                  onClick={(_, form) => removeAction(form, row.index)}
                >
                  <DinaMessage id="remove" />
                </FormikButton>
              </div>
            )
          }
        ])
  ];

  return (
    <FastField name={fieldName} key={JSON.stringify(actionToEdit)}>
      {({ field: { value }, form }) => {
        const scheduledActions = (value ?? []) as ScheduledAction[];

        const hasActions = !!scheduledActions.length;

        async function saveAction(savedAction: ScheduledAction) {
          if (actionToEdit === "NEW" || !actionToEdit) {
            form.setFieldValue(fieldName, [...scheduledActions, savedAction]);
          } else {
            form.setFieldValue(
              fieldName,
              scheduledActions.map((action, index) =>
                index === actionToEdit?.index ? savedAction : action
              )
            );
          }
          setActionToEdit(null);
        }

        return (
          <FieldSet
            className={className}
            id="scheduled-actions-section"
            legend={<DinaMessage id="scheduledActions" />}
          >
            {hasActions && (
              <ReactTable
                columns={actionColumns}
                defaultSorted={[{ id: "date", desc: true }]}
                data={scheduledActions}
                minRows={scheduledActions.length}
                showPagination={false}
                className="-striped mb-2"
                // Implement the edit feature:
                ExpanderComponent={() => null}
                expanded={
                  typeof actionToEdit === "object"
                    ? { [actionToEdit?.viewIndex ?? -1]: true }
                    : undefined
                }
                SubComponent={row => (
                  <div className="m-2">
                    <ScheduledActionSubForm
                      actionToEdit={row.original}
                      onSaveAction={saveAction}
                      onCancelClick={
                        hasActions ? () => setActionToEdit(null) : undefined
                      }
                    />
                  </div>
                )}
                sortable={false}
              />
            )}
            {readOnly ? null : !hasActions || actionToEdit === "NEW" ? (
              <ScheduledActionSubForm
                onSaveAction={saveAction}
                onCancelClick={
                  hasActions ? () => setActionToEdit(null) : undefined
                }
              />
            ) : (
              <FormikButton
                className="btn btn-primary mb-3 add-new-button"
                buttonProps={() => ({ style: { width: "10rem" } })}
                onClick={() => setActionToEdit("NEW")}
              >
                <DinaMessage id="addNew" />
              </FormikButton>
            )}
          </FieldSet>
        );
      }}
    </FastField>
  );
}

export interface ScheduledActionSubFormProps {
  onSaveAction: (action: ScheduledAction) => Promise<void>;
  onCancelClick?: () => void;
  actionToEdit?: ScheduledAction;
}

export function ScheduledActionSubForm({
  onSaveAction,
  onCancelClick,
  actionToEdit
}: ScheduledActionSubFormProps) {
  const { enabledFields, initialValues, isTemplate } = useDinaFormContext();

  const actionsEnabledFields = enabledFields?.filter(it =>
    it.startsWith("scheduledAction.")
  );

  const actionTemplateInitialValues = enabledFields
    ? initialValues.scheduledAction
    : undefined;

  function disableEnterToSubmitOuterForm(e) {
    // Pressing enter should not submit the outer form:
    if (e.keyCode === 13 && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      // TODO Submit inner form.
    }
  }

  // Use a subform for Material Sample form, or use the parent template form for templates.
  const FormWrapper = isTemplate ? Fragment : DinaForm;

  /** Applies name prefix to field props */
  function fieldProps(fieldName: keyof ScheduledAction) {
    const templateFieldName = `scheduledAction.${fieldName}`;
    return {
      name: isTemplate ? templateFieldName : fieldName,
      // If the first determination is enabled, then enable multiple determinations:
      templateCheckboxFieldName: templateFieldName,
      // Don't use the prefix for the labels and tooltips:
      customName: fieldName
    };
  }

  const submitAction: OnFormikSubmit<any> = async (newAction, formik) => {
    // Return if the sub-form has errors:
    const formErrors = await formik.validateForm();
    if (!isEmpty(formErrors)) {
      formik.setErrors({ ...formik.errors, ...formErrors });
      return;
    }
    await onSaveAction(newAction);
  };

  return (
    <div onKeyDown={disableEnterToSubmitOuterForm}>
      <FieldSet legend={<DinaMessage id="addScheduledAction" />}>
        <FormWrapper
          validationSchema={scheduledActionSchema}
          initialValues={actionToEdit ?? actionTemplateInitialValues ?? {}}
          enabledFields={actionsEnabledFields}
        >
          <div className="row">
            <TextField {...fieldProps("actionType")} className="col-sm-6" />
            <DateField {...fieldProps("date")} className="col-sm-6" />
          </div>
          <div className="row">
            <TextField {...fieldProps("actionStatus")} className="col-sm-6" />
            <UserSelectField
              {...fieldProps("assignedTo")}
              className="col-sm-6"
            />
          </div>
          <TextField {...fieldProps("remarks")} multiLines={true} />
          {!isTemplate && (
            <div className="d-flex justify-content-center gap-2">
              <FormikButton
                className="btn btn-primary mb-3 save-button"
                buttonProps={() => ({ style: { width: "10rem" } })}
                onClick={submitAction}
              >
                <DinaMessage id={actionToEdit ? "submitBtnText" : "add"} />
              </FormikButton>
              {onCancelClick && (
                <FormikButton
                  className="btn btn-dark mb-3"
                  buttonProps={() => ({ style: { width: "10rem" } })}
                  onClick={onCancelClick}
                >
                  <DinaMessage id="cancelButtonText" />
                </FormikButton>
              )}
            </div>
          )}
        </FormWrapper>
      </FieldSet>
    </div>
  );
}
