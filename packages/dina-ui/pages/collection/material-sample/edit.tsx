import {
  BackButton,
  ButtonBar,
  DinaForm,
  DinaFormContext,
  DinaFormSection,
  FieldSet,
  FieldSpy,
  filterBy,
  LoadingSpinner,
  ResourceSelect,
  SubmitButton,
  withResponse
} from "common-ui";
import { FormikProps } from "formik";
import { InputResource, PersistedResource } from "kitsu";
import { compact, toPairs, uniq } from "lodash";
import { useRouter } from "next/router";
import { Fragment, ReactNode, Ref, useContext, useState } from "react";
import {
  AttachmentsField,
  BulkEditTabWarning,
  CollectingEventLinker,
  Footer,
  GroupSelectField,
  Head,
  MaterialSampleBreadCrumb,
  MaterialSampleFormNav,
  MaterialSampleIdentifiersSection,
  MaterialSampleInfoSection,
  Nav,
  nextSampleInitialValues,
  OrganismsField,
  ProjectSelectSection,
  ScheduledActionsField,
  SetDefaultSampleName,
  StorageLinkerField,
  TabbedResourceLinker,
  TagsAndRestrictionsSection,
  useCollectingEventQuery,
  useMaterialSampleQuery,
  useMaterialSampleSave,
  useMaterialSampleFormCustomViewProps
} from "../../../components";
import { AcquisitionEventLinker } from "../../../components/collection/AcquisitionEventLinker";
import { AssociationsField } from "../../../components/collection/AssociationsField";
import { CollectingEventBriefDetails } from "../../../components/collection/collecting-event/CollectingEventBriefDetails";
import { PreparationField } from "../../../components/collection/material-sample/PreparationField";
import { SaveAndCopyToNextSuccessAlert } from "../../../components/collection/SaveAndCopyToNextSuccessAlert";
import { AllowAttachmentsConfig } from "../../../components/object-store";
import { ManagedAttributesEditor } from "../../../components/object-store/managed-attributes/ManagedAttributesEditor";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";
import {
  AcquisitionEvent,
  CollectingEvent,
  CustomView,
  MaterialSample,
  MaterialSampleFormSectionId
} from "../../../types/collection-api";
import {
  AcquisitionEventFormLayout,
  useAcquisitionEvent
} from "../acquisition-event/edit";

export type PostSaveRedirect = "VIEW" | "CREATE_NEXT";

export default function MaterialSampleEditPage() {
  const router = useRouter();

  const id = router.query.id?.toString();
  const copyFromId = router.query.copyFromId?.toString();
  const lastCreatedId = router.query.lastCreatedId?.toString();

  const { formatMessage } = useDinaIntl();

  const materialSampleQuery = useMaterialSampleQuery(id);
  const copyFromQuery = useMaterialSampleQuery(copyFromId);

  /** The page to redirect to after saving. */
  const [saveRedirect, setSaveRedirect] = useState<PostSaveRedirect>("VIEW");

  async function moveToViewPage(savedId: string) {
    await router.push(`/collection/material-sample/view?id=${savedId}`);
  }

  async function moveToNextSamplePage(savedId: string) {
    await router.push(
      `/collection/material-sample/edit?copyFromId=${savedId}&lastCreatedId=${savedId}`
    );
  }

  const title = id ? "editMaterialSampleTitle" : "addMaterialSampleTitle";

  const [sampleFormCustomView, setSampleFormCustomView] =
    useState<PersistedResource<CustomView>>();

  const sampleFormProps: Partial<MaterialSampleFormProps> = {
    enableStoredDefaultGroup: true,
    buttonBar: (
      <ButtonBar>
        <BackButton entityId={id} entityLink="/collection/material-sample" />
        <div className="flex-grow-1 d-flex">
          <div className="mx-auto" style={{ width: "20rem" }}>
            <label>
              <div className="mb-2 fw-bold">
                <DinaMessage id="customMaterialSampleFormView" />
              </div>
              <FieldSpy<string> fieldName="group">
                {group => (
                  <ResourceSelect<CustomView>
                    filter={input => ({
                      // Filter by "material-sample-form-section-order" to omit unrelated custom-view records:
                      "viewConfiguration.type":
                        "material-sample-form-custom-view",
                      // Filter by view name typed into the dropdown:
                      ...filterBy(["name"])(input),
                      // Filter by the form's group:
                      ...(group && { group: { EQ: `${group}` } })
                    })}
                    optionLabel={view => view.name || view.id}
                    model="collection-api/custom-view"
                    onChange={newVal =>
                      setSampleFormCustomView(
                        newVal as PersistedResource<CustomView>
                      )
                    }
                    value={sampleFormCustomView}
                  />
                )}
              </FieldSpy>
            </label>
          </div>
        </div>
        {!id && (
          <SubmitButton
            buttonProps={() => ({
              style: { width: "12rem" },
              onClick: () => setSaveRedirect("CREATE_NEXT")
            })}
          >
            <DinaMessage id="saveAndCopyToNext" />
          </SubmitButton>
        )}
        <SubmitButton
          buttonProps={() => ({ onClick: () => setSaveRedirect("VIEW") })}
        />
      </ButtonBar>
    ),
    // On save either redirect to the view page or create the next sample with the same values:
    onSaved:
      saveRedirect === "CREATE_NEXT" ? moveToNextSamplePage : moveToViewPage
  };

  return (
    <div>
      <Head title={formatMessage(title)} />
      <Nav />
      <main className="container-fluid">
        {!id &&
          !!lastCreatedId &&
          withResponse(copyFromQuery, ({ data: originalSample }) => (
            <SaveAndCopyToNextSuccessAlert
              id={lastCreatedId}
              displayName={
                !!originalSample.materialSampleName?.length
                  ? originalSample.materialSampleName
                  : lastCreatedId
              }
              entityPath={"collection/material-sample"}
            />
          ))}
        <h1 id="wb-cont">
          <DinaMessage id={title} />
        </h1>
        {id ? (
          withResponse(materialSampleQuery, ({ data: sample }) => (
            <MaterialSampleForm {...sampleFormProps} materialSample={sample} />
          ))
        ) : copyFromId ? (
          withResponse(copyFromQuery, ({ data: originalSample }) => {
            const initialValues = nextSampleInitialValues(originalSample);
            return (
              <MaterialSampleForm
                {...sampleFormProps}
                materialSample={initialValues}
                disableAutoNamePrefix={true}
              />
            );
          })
        ) : (
          <MaterialSampleForm {...sampleFormProps} />
        )}
      </main>
      <Footer />
    </div>
  );
}

/**
 * The enabled fields if creating from a template.
 * Nested DinaForms (Collecting Event and Acquisition Event) have separate string arrays.
 */
export interface MatrialSampleFormEnabledFields {
  materialSample: string[];
  collectingEvent: string[];
  acquisitionEvent: string[];
}
export interface MaterialSampleFormProps {
  materialSample?: InputResource<MaterialSample>;
  collectingEventInitialValues?: InputResource<CollectingEvent>;
  acquisitionEventInitialValues?: InputResource<AcquisitionEvent>;

  onSaved?: (id: string) => Promise<void>;

  /** Optionally call the hook from the parent component. */
  materialSampleSaveHook?: ReturnType<typeof useMaterialSampleSave>;

  /** Template form values for template mode. */
  templateInitialValues?: Partial<MaterialSample> & {
    templateCheckboxes?: Record<string, boolean | undefined>;
  };

  /** The enabled fields if creating from a template. */
  enabledFields?: MatrialSampleFormEnabledFields;

  attachmentsConfig?: {
    materialSample: AllowAttachmentsConfig;
    collectingEvent: AllowAttachmentsConfig;
  };

  buttonBar?: ReactNode;

  /** Disables prefixing the sample name with the Collection code. */
  disableAutoNamePrefix?: boolean;

  /** Makes the sample name field (Primary ID) read-only. */
  disableSampleNameField?: boolean;

  materialSampleFormRef?: Ref<FormikProps<InputResource<MaterialSample>>>;

  /** Disables the "Are You Sure" prompt in the nav when removing a data component. */
  disableNavRemovePrompt?: boolean;

  /**
   * Removes the html tag IDs from hidden tabs.
   * This needs to be done for off-screen forms in the bulk editor.
   */
  isOffScreen?: boolean;

  /** Reduces the rendering to improve performance when bulk editing many material samples. */
  reduceRendering?: boolean;

  /** Hide the use next identifer checkbox, e.g when create multiple new samples */
  hideUseSequence?: boolean;
  /** Sets a default group from local storage when the group is not already set. */
  enableStoredDefaultGroup?: boolean;

  /** Hides the custom view selection, but keeps the drag/drop handles. */
  hideCustomViewSelect?: boolean;
  /** Optional controlled state for the left-side Nav bar (default uncontrolled). */
  navOrder?: MaterialSampleFormSectionId[] | null;
  onChangeNavOrder?: (newOrder: MaterialSampleFormSectionId[] | null) => void;
}

export function MaterialSampleForm({
  materialSample,
  collectingEventInitialValues,
  acquisitionEventInitialValues,
  onSaved,
  materialSampleSaveHook,
  enabledFields,
  attachmentsConfig,
  disableAutoNamePrefix,
  materialSampleFormRef,
  disableSampleNameField,
  disableNavRemovePrompt,
  isOffScreen,
  reduceRendering,
  hideUseSequence,
  enableStoredDefaultGroup,
  hideCustomViewSelect,
  navOrder: navOrderProp,
  onChangeNavOrder: onChangeNavOrderProp,
  buttonBar = (
    <ButtonBar>
      <BackButton
        entityId={materialSample?.id}
        entityLink="/collection/material-sample"
      />
      <SubmitButton className="ms-auto" />
    </ButtonBar>
  )
}: MaterialSampleFormProps) {
  const { isTemplate } = useContext(DinaFormContext) ?? {};
  const {
    initialValues,
    nestedCollectingEventForm,
    nestedAcqEventForm,
    dataComponentState,
    colEventId,
    setColEventId,
    acqEventId,
    setAcqEventId,
    onSubmit,
    loading
  } =
    materialSampleSaveHook ??
    useMaterialSampleSave({
      collectingEventAttachmentsConfig: attachmentsConfig?.collectingEvent,
      materialSample,
      collectingEventInitialValues,
      acquisitionEventInitialValues,
      onSaved,
      isTemplate,
      enabledFields,
      reduceRendering
    });

  // CollectingEvent "id" being enabled in the template enabledFields means that the
  // Template links an existing Collecting Event:
  const templateAttachesCollectingEvent = Boolean(
    enabledFields?.collectingEvent.includes("id")
  );
  const templateAttachesAcquisitionEvent = Boolean(
    enabledFields?.acquisitionEvent.includes("id")
  );

  const attachmentsField = "attachment";

  const navState = useState<MaterialSampleFormSectionId[] | null>(null);

  // Allow either controlled or uncontrolle state for the nav section:
  const [formSectionOrder, setFormSectionOrder] = onChangeNavOrderProp
    ? [navOrderProp, onChangeNavOrderProp]
    : navState;

  /**
   * A map where:
   * - The key is the form section ID.
   * - The value is the section's render function given the ID as a param.
   */
  const formSections: Record<
    MaterialSampleFormSectionId,
    (id: string) => ReactNode
  > = {
    "identifiers-section": id =>
      !reduceRendering && (
        <MaterialSampleIdentifiersSection
          id={id}
          disableSampleNameField={disableSampleNameField}
          hideUseSequence={hideUseSequence}
        />
      ),
    "material-sample-info-section": id =>
      !reduceRendering && <MaterialSampleInfoSection id={id} />,
    "collecting-event-section": id =>
      dataComponentState.enableCollectingEvent && (
        <TabbedResourceLinker<CollectingEvent>
          fieldSetId={id}
          legend={<DinaMessage id="collectingEvent" />}
          briefDetails={colEvent => (
            <CollectingEventBriefDetails collectingEvent={colEvent} />
          )}
          linkerTabContent={
            reduceRendering ? null : (
              <CollectingEventLinker
                onCollectingEventSelect={colEventToLink => {
                  setColEventId(colEventToLink.id);
                }}
              />
            )
          }
          nestedForm={nestedCollectingEventForm}
          useResourceQuery={useCollectingEventQuery}
          setResourceId={setColEventId}
          disableLinkerTab={templateAttachesCollectingEvent}
          readOnlyLink="/collection/collecting-event/view?id="
          resourceId={colEventId}
          fieldName="collectingEvent"
          targetType="materialSample"
        />
      ),
    "acquisition-event-section": id =>
      dataComponentState.enableAcquisitionEvent && (
        <TabbedResourceLinker<AcquisitionEvent>
          fieldSetId={id}
          legend={<DinaMessage id="acquisitionEvent" />}
          briefDetails={acqEvent => (
            <DinaForm initialValues={acqEvent} readOnly={true}>
              <AcquisitionEventFormLayout />
            </DinaForm>
          )}
          linkerTabContent={
            reduceRendering ? null : (
              <AcquisitionEventLinker
                onAcquisitionEventSelect={acqEventToLink => {
                  setAcqEventId(acqEventToLink.id);
                }}
              />
            )
          }
          nestedForm={nestedAcqEventForm}
          useResourceQuery={useAcquisitionEvent}
          setResourceId={setAcqEventId}
          disableLinkerTab={templateAttachesAcquisitionEvent}
          readOnlyLink="/collection/acquisition-event/view?id="
          resourceId={acqEventId}
          fieldName="acquisitionEvent"
          targetType="materialSample"
        />
      ),
    "preparations-section": id =>
      !reduceRendering &&
      dataComponentState.enablePreparations && (
        <PreparationField
          id={id}
          // Use the same attachments config for preparations as the Material Sample:
          attachmentsConfig={attachmentsConfig?.materialSample}
        />
      ),
    "organisms-section": id =>
      !reduceRendering &&
      dataComponentState.enableOrganisms && (
        <OrganismsField id={id} name="organism" />
      ),
    "associations-section": id =>
      !reduceRendering &&
      dataComponentState.enableAssociations && <AssociationsField id={id} />,
    "storage-section": id =>
      !reduceRendering &&
      dataComponentState.enableStorage && (
        <FieldSet
          id={id}
          legend={<DinaMessage id="storage" />}
          fieldName="storageUnit"
        >
          <StorageLinkerField
            name="storageUnit"
            hideLabel={true}
            targetType="material-sample"
          />
        </FieldSet>
      ),
    "scheduled-actions-section": id =>
      !reduceRendering &&
      dataComponentState.enableScheduledActions && (
        <ScheduledActionsField
          id={id}
          wrapContent={content => (
            <BulkEditTabWarning
              targetType="material-sample"
              fieldName="scheduledActions"
            >
              {content}
            </BulkEditTabWarning>
          )}
        />
      ),
    "managedAttributes-section": id =>
      !reduceRendering && (
        <DinaFormSection
          // Disabled the template's restrictions for this section:
          enabledFields={null}
        >
          <div className="row">
            <div className="col-md-6">
              <ManagedAttributesEditor
                valuesPath="managedAttributes"
                managedAttributeApiPath="collection-api/managed-attribute"
                managedAttributeComponent="MATERIAL_SAMPLE"
                fieldSetProps={{
                  id,
                  legend: <DinaMessage id="materialSampleManagedAttributes" />
                }}
                // Custom view selection is supported for material samples,
                // but not in template editor mode:
                showCustomViewDropdown={!isTemplate}
                managedAttributeOrderFieldName="managedAttributesOrder"
              />
            </div>
          </div>
        </DinaFormSection>
      ),
    "material-sample-attachments-section": id =>
      !reduceRendering && (
        <AttachmentsField
          name={attachmentsField}
          title={<DinaMessage id="materialSampleAttachments" />}
          id={id}
          allowNewFieldName="attachmentsConfig.allowNew"
          allowExistingFieldName="attachmentsConfig.allowExisting"
          allowAttachmentsConfig={attachmentsConfig?.materialSample}
          attachmentPath={`collection-api/material-sample/${materialSample?.id}/attachment`}
          wrapContent={content => (
            <BulkEditTabWarning
              targetType="material-sample"
              fieldName={attachmentsField}
            >
              {content}
            </BulkEditTabWarning>
          )}
        />
      )
  };

  const formSectionPairs = toPairs(formSections);

  const sortedFormSectionPairs = uniq([
    ...compact(
      (formSectionOrder ?? []).map(id =>
        formSectionPairs.find(([it]) => it === id)
      )
    ),
    ...formSectionPairs
  ]);

  const formLayout = (
    <div className="d-md-flex">
      <div style={{ minWidth: "20rem", maxWidth: "20rem" }}>
        {(!isOffScreen || !reduceRendering) && (
          <MaterialSampleFormNav
            dataComponentState={dataComponentState}
            disableRemovePrompt={disableNavRemovePrompt}
            hideCustomViewSelect={hideCustomViewSelect}
            navOrder={formSectionOrder}
            onChangeNavOrder={setFormSectionOrder}
          />
        )}
      </div>
      <div className="flex-grow-1 container-fluid">
        {!reduceRendering && (
          <>
            {!isTemplate && materialSample && (
              <MaterialSampleBreadCrumb
                disableLastLink={true}
                materialSample={materialSample as any}
              />
            )}
            {!isTemplate && (
              <div className="row">
                <div className="col-md-6">
                  <GroupSelectField
                    name="group"
                    enableStoredDefaultGroup={enableStoredDefaultGroup}
                  />
                </div>
              </div>
            )}
            <TagsAndRestrictionsSection resourcePath="collection-api/material-sample" />
            <ProjectSelectSection
              classNames="mt-3"
              resourcePath="collection-api/project"
            />
          </>
        )}
        {/* The toggleable / re-arrangeable form sections: */}
        <div className="data-components">
          {sortedFormSectionPairs.map(([id, renderFn]) => (
            <Fragment key={id}>{renderFn(isOffScreen ? "" : id)}</Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  return isTemplate ? (
    formLayout
  ) : loading ? (
    <LoadingSpinner loading={true} />
  ) : (
    <DinaForm<InputResource<MaterialSample>>
      innerRef={materialSampleFormRef}
      initialValues={initialValues}
      onSubmit={onSubmit}
      enabledFields={enabledFields?.materialSample}
    >
      {!initialValues.id && !disableAutoNamePrefix && <SetDefaultSampleName />}
      {buttonBar}
      {formLayout}
      {buttonBar}
    </DinaForm>
  );
}
