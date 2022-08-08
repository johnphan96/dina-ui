import {
  BackButton,
  ButtonBar,
  DeleteButton,
  DinaForm,
  EditButton,
  FieldSet,
  withResponse
} from "common-ui";
import { Field } from "formik";
import { isEmpty } from "lodash";
import { WithRouterProps } from "next/dist/client/with-router";
import Link from "next/link";
import { withRouter } from "next/router";
import { GenerateLabelSection } from "../../../../dina-ui/components/collection/material-sample/GenerateLabelSection";
import InheritedDeterminationSection from "../../../components/collection/material-sample/InheritedDeterminationSection";
import {
  AssociationsField,
  CollectingEventFormLayout,
  Footer,
  Head,
  HOSTORGANISM_FIELDS,
  ManagedAttributesEditor,
  MaterialSampleBreadCrumb,
  MaterialSampleIdentifiersSection,
  MaterialSampleInfoSection,
  MaterialSampleStateWarning,
  Nav,
  OrganismsField,
  PreparationField,
  PREPARATION_FIELDS,
  ProjectSelectSection,
  AssemblageSelectSection,
  TagSelectReadOnly,
  SamplesView,
  ScheduledActionsField,
  StorageLinkerField,
  TagsAndRestrictionsSection,
  useCollectingEventQuery,
  useMaterialSampleQuery,
  withOrganismEditorValues
} from "../../../components";
import { AttachmentReadOnlySection } from "../../../components/object-store/attachment-list/AttachmentReadOnlySection";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";
import {
  AcquisitionEventFormLayout,
  useAcquisitionEvent
} from "../../../pages/collection/acquisition-event/edit";
import { MaterialSample } from "../../../types/collection-api";

export function MaterialSampleViewPage({ router }: WithRouterProps) {
  const { formatMessage } = useDinaIntl();

  const id = router.query.id?.toString();

  const materialSampleQuery = useMaterialSampleQuery(id);

  // Get info of highest parent material sample if one exists
  const highestParentId =
    materialSampleQuery.response?.data.parentMaterialSample &&
    materialSampleQuery.response?.data.hierarchy?.at(-1)?.uuid.toString();
  const highestParentMaterialSample =
    materialSampleQuery.response?.data.parentMaterialSample &&
    materialSampleQuery.response?.data.hierarchy?.at(-1)?.name;
  const highestMaterialSampleQuery = useMaterialSampleQuery(highestParentId);

  const colEventQuery = useCollectingEventQuery(
    highestParentId
      ? highestMaterialSampleQuery.response?.data?.collectingEvent?.id
      : materialSampleQuery.response?.data?.collectingEvent?.id
  );

  const acqEventQuery = useAcquisitionEvent(
    materialSampleQuery.response?.data?.acquisitionEvent?.id
  );

  const buttonBar = id && (
    <ButtonBar className="flex">
      <BackButton
        entityId={id}
        entityLink="/collection/material-sample"
        byPassView={true}
        className="me-auto"
      />
      <EditButton entityId={id} entityLink="collection/material-sample" />
      <Link href={`/collection/material-sample/bulk-create?splitFromId=${id}`}>
        <a className="btn btn-primary">
          <DinaMessage id="splitButton" />
        </a>
      </Link>
      <Link href={`/collection/material-sample/edit/?copyFromId=${id}`}>
        <a className="btn btn-primary">
          <DinaMessage id="duplicate" />
        </a>
      </Link>
      <Link href={`/collection/material-sample/revisions?id=${id}`}>
        <a className="btn btn-info ms-5">
          <DinaMessage id="revisionsButtonText" />
        </a>
      </Link>
      <DeleteButton
        className="ms-5"
        id={id}
        options={{ apiBaseUrl: "/collection-api" }}
        postDeleteRedirect="/collection/material-sample/list"
        type="material-sample"
      />
    </ButtonBar>
  );

  const collectingEventParentLink = (
    <Link href={`/collection/material-sample/view?id=${highestParentId}`}>
      <a>{highestParentMaterialSample}</a>
    </Link>
  );

  return (
    <div>
      {withResponse(materialSampleQuery, ({ data: materialSampleData }) => {
        const materialSample = withOrganismEditorValues(materialSampleData);

        const hasPreparations = PREPARATION_FIELDS.some(
          fieldName => !isEmpty(materialSample[fieldName])
        );

        const hasOrganism = materialSample?.organism?.some(
          org => !isEmpty(org)
        );

        // Find first parent with targetOrganismPrimaryDetermination in hierachy
        const parentWithDetermination = hasOrganism
          ? null
          : materialSample?.hierarchy?.find(hierachyItem =>
              hierachyItem.hasOwnProperty("targetOrganismPrimaryDetermination")
            );

        const inheritedDetermination =
          parentWithDetermination?.targetOrganismPrimaryDetermination;

        const targetOrganismPrimaryDeterminationParentLink = (
          <Link
            href={`/collection/material-sample/view?id=${parentWithDetermination?.uuid}`}
          >
            <a>{parentWithDetermination?.name}</a>
          </Link>
        );

        /* Consider as having association if either host organism any field has value or having any non empty association in the array */
        const hasAssociations =
          materialSample?.associations?.some(assct => !isEmpty(assct)) ||
          HOSTORGANISM_FIELDS.some(
            fieldName => materialSample.hostOrganism?.[fieldName]
          );

        return (
          <>
            <Head
              title={formatMessage("materialSampleViewTitle", {
                primaryID: materialSample?.materialSampleName
              })}
            />
            <Nav />
            <main className="container-fluid">
              <DinaForm<MaterialSample>
                initialValues={materialSample}
                readOnly={true}
              >
                {buttonBar}
                <MaterialSampleStateWarning />

                {/* Material Sample Hierarchy */}
                <MaterialSampleBreadCrumb
                  materialSample={materialSample}
                  disableLastLink={true}
                />
                <div className="d-flex flex-row gap-2">
                  <TagsAndRestrictionsSection />
                </div>
                <div className="d-flex flex-row gap-2">
                  <TagSelectReadOnly />
                  <ProjectSelectSection />
                  <AssemblageSelectSection />
                </div>
                <div className="mb-3">
                  <div className="col-md-6">
                    <GenerateLabelSection
                      title={<DinaMessage id="generateLabel" />}
                      materialSample={materialSample}
                    />
                  </div>
                </div>
                <MaterialSampleIdentifiersSection />
                {materialSample.parentMaterialSample && (
                  <SamplesView
                    samples={[materialSample.parentMaterialSample]}
                    fieldSetId={<DinaMessage id="parentMaterialSample" />}
                  />
                )}
                {!!materialSample.materialSampleChildren?.length && (
                  <SamplesView
                    samples={materialSample.materialSampleChildren}
                    fieldSetId={<DinaMessage id="childMaterialSamples" />}
                  />
                )}
                <MaterialSampleInfoSection />
                {withResponse(colEventQuery, ({ data: colEvent }) => (
                  <FieldSet legend={<DinaMessage id="collectingEvent" />}>
                    {materialSample.parentMaterialSample && (
                      <div
                        style={{
                          marginLeft: "16px"
                        }}
                      >
                        <DinaMessage
                          id="fromParent"
                          values={{ parentLink: collectingEventParentLink }}
                        />
                      </div>
                    )}
                    <DinaForm initialValues={colEvent} readOnly={true}>
                      <div className="mb-3 d-flex justify-content-end align-items-center">
                        <Link
                          href={`/collection/collecting-event/view?id=${colEvent.id}`}
                        >
                          <a>
                            <DinaMessage id="detailsPageLink" />
                          </a>
                        </Link>
                      </div>
                      <CollectingEventFormLayout />
                    </DinaForm>
                  </FieldSet>
                ))}
                {withResponse(acqEventQuery, ({ data: acqEvent }) => (
                  <FieldSet
                    id="acquisition-event-section"
                    legend={<DinaMessage id="acquisitionEvent" />}
                  >
                    <DinaForm initialValues={acqEvent} readOnly={true}>
                      <div className="mb-3 d-flex justify-content-end align-items-center">
                        <Link
                          href={`/collection/acquisition-event/view?id=${acqEvent.id}`}
                        >
                          <a>
                            <DinaMessage id="detailsPageLink" />
                          </a>
                        </Link>
                      </div>
                      <AcquisitionEventFormLayout />
                    </DinaForm>
                  </FieldSet>
                ))}
                {hasPreparations && <PreparationField />}
                {hasOrganism && <OrganismsField name="organism" />}
                {inheritedDetermination && (
                  <div className="row">
                    <div className="col-md-6">
                      <InheritedDeterminationSection
                        inheritedDetermination={inheritedDetermination}
                        parentLink={
                          targetOrganismPrimaryDeterminationParentLink
                        }
                        materialSample={materialSample}
                      />
                    </div>
                  </div>
                )}
                {hasAssociations && <AssociationsField />}
                {materialSample.storageUnit && (
                  <div className="card card-body mb-3">
                    <StorageLinkerField
                      name="storageUnit"
                      targetType="material-sample"
                    />
                  </div>
                )}
                {!!materialSample?.scheduledActions?.length && (
                  <ScheduledActionsField />
                )}
                <div className="row">
                  <div className="col-md-6">
                    <ManagedAttributesEditor
                      fieldSetProps={{
                        legend: (
                          <DinaMessage id="materialSampleManagedAttributes" />
                        )
                      }}
                      valuesPath="managedAttributes"
                      managedAttributeApiPath="collection-api/managed-attribute"
                      managedAttributeComponent="MATERIAL_SAMPLE"
                      showFormTemplateDropdown={true}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <Field name="id">
                    {({ field: { value: materialSampleId } }) => (
                      <AttachmentReadOnlySection
                        attachmentPath={`collection-api/material-sample/${materialSampleId}/attachment`}
                        detachTotalSelected={true}
                        title={<DinaMessage id="materialSampleAttachments" />}
                      />
                    )}
                  </Field>
                </div>
              </DinaForm>
              {buttonBar}
            </main>
          </>
        );
      })}
      <Footer />
    </div>
  );
}

export default withRouter(MaterialSampleViewPage);
