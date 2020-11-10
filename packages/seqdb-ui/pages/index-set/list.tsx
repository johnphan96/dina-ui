import { ColumnDefinition, ListPageLayout } from "common-ui";
import Link from "next/link";
import { Head, Nav } from "../../components";
import { IndexSet } from "../../types/seqdb-api";
import { useSeqdbIntl, SeqdbMessage } from "../../intl/seqdb-intl";

const INDEX_SET_FILTER_ATTRIBUTES = [
  "name",
  "forwardadapter",
  "reverseadapter"
];

const INDEX_SET_TABLE_COLUMNS: ColumnDefinition<IndexSet>[] = [
  {
    Cell: ({ original: { id, name } }) => (
      <Link href={`/index-set/view?id=${id}`}>
        <a>{name}</a>
      </Link>
    ),
    Header: "Name",
    accessor: "name"
  },
  "group",
  "forwardAdapter",
  "reverseAdapter"
];

export default function IndexSetListPage() {
  const { formatMessage } = useSeqdbIntl();

  return (
    <>
      <Head title={formatMessage("indexSetListTitle")} />
      <Nav />
      <div className="container-fluid">
        <h1>
          <SeqdbMessage id="indexSetListTitle" />
        </h1>
        <ListPageLayout
          filterAttributes={INDEX_SET_FILTER_ATTRIBUTES}
          id="index-set-list"
          queryTableProps={{
            columns: INDEX_SET_TABLE_COLUMNS,
            path: "seqdb-api/indexSet"
          }}
        />
      </div>
    </>
  );
}
