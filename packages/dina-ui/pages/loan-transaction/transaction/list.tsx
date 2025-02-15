import {
  ButtonBar,
  CreateButton,
  FieldHeader,
  QueryPage,
  booleanCell8,
  dateCell8,
  stringArrayCell8
} from "common-ui";
import { TableColumn8 } from "common-ui/lib/list-page/types";
import Link from "next/link";
import { Transaction } from "packages/dina-ui/types/loan-transaction-api";
import { Footer, Head, Nav } from "../../../components";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";

export const TRANSACTION_TABLE_COLUMNS: TableColumn8<Transaction>[] = [
  {
    cell: ({ row: { original } }) => (
      <Link href={`/loan-transaction/transaction/view?id=${original.id}`}>
        <a>
          {(original as any).data?.attributes?.transactionNumber || original.id}
        </a>
      </Link>
    ),
    header: () => <FieldHeader name="transactionNumber" />,
    accessorKey: "data.attributes.transactionNumber",
    isKeyword: true
  },
  {
    header: () => <FieldHeader name="transactionType" />,
    accessorKey: "data.attributes.transactionType",
    isKeyword: true
  },
  {
    header: () => <FieldHeader name="materialDirection" />,
    accessorKey: "data.attributes.materialDirection",
    isKeyword: true
  },
  stringArrayCell8("otherIdentifiers", "data.attributes.otherIdentifiers"),
  booleanCell8("materialToBeReturned", "data.attributes.materialToBeReturned"),
  {
    header: () => <FieldHeader name="purpose" />,
    accessorKey: "data.attributes.purpose",
    isKeyword: true
  },
  {
    header: () => <FieldHeader name="status" />,
    accessorKey: "data.attributes.status",
    isKeyword: true
  },
  dateCell8("openedDate", "data.attributes.openedDate"),
  dateCell8("closedDate", "data.attributes.closedDate"),
  dateCell8("dueDate", "data.attributes.dueDate")
];

export default function TransactionListPage() {
  const { formatMessage } = useDinaIntl();

  return (
    <div>
      <Head title={formatMessage("transactions")} />
      <Nav />
      <main className="container-fluid">
        <h1 id="wb-cont">
          <DinaMessage id="transactions" />
        </h1>
        <ButtonBar>
          <CreateButton entityLink="/loan-transaction/transaction" />
        </ButtonBar>
        <QueryPage
          indexName={"dina_loan_transaction_index"}
          columns={TRANSACTION_TABLE_COLUMNS}
          dynamicFieldMapping={{
            fields: [
              {
                type: "managedAttribute",
                label: "managedAttributes",
                path: "data.attributes.managedAttributes",
                apiEndpoint: "loan-transaction-api/managed-attribute"
              }
            ],
            relationshipFields: []
          }}
        />
      </main>
      <Footer />
    </div>
  );
}
