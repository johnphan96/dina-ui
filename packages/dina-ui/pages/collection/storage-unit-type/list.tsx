import { ButtonBar, CreateButton, ListPageLayout, dateCell } from "common-ui";
import Link from "next/link";
import { Footer, GroupSelectField, Head, Nav } from "../../../components";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";

const STORAGE_UNIT_TYPE_FILTER_ATTRIBUTES = ["name", "createdBy"];
const STORAGE_UNIT_TYPE_TABLE_COLUMNS = [
  {
    Cell: ({ original: { id, name } }) => (
      <Link href={`/collection/storage-unit-type/view?id=${id}`}>{name}</Link>
    ),
    accessor: "name"
  },
  "group",
  "createdBy",
  dateCell("createdOn")
];

export default function storageUnitTypeListPage() {
  const { formatMessage } = useDinaIntl();

  return (
    <div>
      <Head title={formatMessage("storageUnitTypeListTitle")} />
      <Nav />
      <main className="container-fluid">
        <h1>
          <DinaMessage id="storageUnitTypeListTitle" />
        </h1>
        <ButtonBar>
          <CreateButton entityLink="/collection/storage-unit-type" />
        </ButtonBar>
        <ListPageLayout
          additionalFilters={filterForm => ({
            // Apply group filter:
            ...(filterForm.group && { rsql: `group==${filterForm.group}` })
          })}
          filterAttributes={STORAGE_UNIT_TYPE_FILTER_ATTRIBUTES}
          id="storage-unit-type-list"
          queryTableProps={{
            columns: STORAGE_UNIT_TYPE_TABLE_COLUMNS,
            path: "collection-api/storage-unit-type"
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
