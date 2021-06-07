import { ButtonBar, CreateButton, ListPageLayout, dateCell } from "common-ui";
import Link from "next/link";
import { Footer, GroupSelectField, Head, Nav } from "../../../components";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";

const ACTION_DEFINITION_FILTER_ATTRIBUTES = ["name", "createdBy", "actionType"];
const ACTION_DEFINITION_TABLE_COLUMNS = [
  {
    Cell: ({ original: { id, name } }) => (
      <Link href={`/collection/workflow-template/edit?id=${id}`}>{name}</Link>
    ),
    accessor: "name"
  },
  "group",
  "createdBy",
  dateCell("createdOn")
];

export default function WorkflowTemplateListPage() {
  const { formatMessage } = useDinaIntl();

  return (
    <div>
      <Head title={formatMessage("workflowTemplateListTitle")} />
      <Nav />
      <main className="container-fluid">
        <h1>
          <DinaMessage id="workflowTemplateListTitle" />
        </h1>
        <ButtonBar>
          <CreateButton entityLink="/collection/workflow-template" />
        </ButtonBar>
        <ListPageLayout
          additionalFilters={filterForm => ({
            // Apply group filter:
            ...(filterForm.group && { rsql: `group==${filterForm.group}` })
          })}
          filterAttributes={ACTION_DEFINITION_FILTER_ATTRIBUTES}
          id="material-sample-action-definition-list"
          queryTableProps={{
            columns: ACTION_DEFINITION_TABLE_COLUMNS,
            path: "collection-api/material-sample-action-definition"
          }}
          filterFormchildren={({ submitForm }) => (
            <div className="mb-3">
              <div style={{ width: "300px" }}>
                <GroupSelectField
                  onChange={() => setImmediate(submitForm)}
                  name="group"
                  showAnyOption={true}
                />
              </div>
            </div>
          )}
        />
      </main>
      <Footer />
    </div>
  );
}
