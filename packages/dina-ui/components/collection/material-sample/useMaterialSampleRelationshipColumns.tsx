import { TableColumn, TableColumn8 } from "common-ui/lib/list-page/types";
import {
  dateCell,
  dateCell8,
  DeleteButton,
  EditButton,
  FieldHeader,
  stringArrayCell,
  stringArrayCell8,
  useStringComparator
} from "common-ui";
import { MaterialSample } from "../../../types/collection-api";
import { getScientificNames } from "./organismUtils";
import { SplitMaterialSampleDropdownButton } from "./SplitMaterialSampleDropdownButton";
import Link from "next/link";

export function useMaterialSampleRelationshipColumns() {
  const { compareByStringAndNumber } = useStringComparator();
  const ELASTIC_SEARCH_COLUMN: TableColumn<MaterialSample>[] = [
    {
      Cell: ({ original: { id, data } }) => (
        <Link href={`/collection/material-sample/view?id=${id}`}>
          <a>
            {data?.attributes?.materialSampleName ||
              data?.attributes?.dwcOtherCatalogNumbers?.join?.(", ") ||
              id}
          </a>
        </Link>
      ),
      label: "materialSampleName",
      accessor: "data.attributes.materialSampleName",
      sortMethod: (a: any, b: any): number => {
        return compareByStringAndNumber(a, b);
      },
      isKeyword: true
    },
    {
      Cell: ({ original }) => {
        let organisms: any[] | undefined = original.included?.organism;
        if (organisms?.[0].attributes) {
          organisms = organisms.map((organism) => {
            return { ...organism, ...organism.attributes };
          });
        }
        const materialSample: MaterialSample = {
          type: "material-sample",
          organism: organisms
        };
        const scientificName = getScientificNames(materialSample);
        return <div className="stringArray-cell">{scientificName}</div>;
      },
      label: "determination.scientificName",
      accessor: "included",
      isKeyword: true,
      sortable: false
    }
  ];

  const ELASTIC_SEARCH_COLUMN8: TableColumn8<MaterialSample>[] = [
    {
      id: "materialSampleName",
      cell: ({ row: { original } }) => (
        <Link href={`/collection/material-sample/view?id=${original.id}`}>
          <a>
            {(original as any).data.attributes.materialSampleName ||
              (original as any).data.attributes.dwcOtherCatalogNumbers?.join?.(
                ", "
              ) ||
              original.id}
          </a>
        </Link>
      ),
      header: () => <FieldHeader name="materialSampleName" />,
      accessorKey: "data.attributes.materialSampleName",
      sortingFn: "alphanumeric",
      isKeyword: true,
      enableSorting: true
    },
    {
      id: "scientificName",
      cell: ({ row: { original } }) => {
        const organisms = (original as any).included?.organism ?? [];
        const materialSample: MaterialSample = {
          type: "material-sample",
          organism: organisms
        };
        const scientificName = getScientificNames(materialSample);
        return <div className="stringArray-cell">{scientificName}</div>;
      },
      header: () => <FieldHeader name="determination.scientificName" />,
      isKeyword: true,
      enableSorting: false
    }
  ];

  const ELASTIC_SEARCH_COLUMN_CHILDREN_VIEW: TableColumn<MaterialSample>[] = [
    {
      Cell: ({ original: { id, data } }) => (
        <Link href={`/collection/material-sample/view?id=${id}`}>
          <a>
            {data?.attributes?.materialSampleName ||
              data?.attributes?.dwcOtherCatalogNumbers?.join?.(", ") ||
              id}
          </a>
        </Link>
      ),
      label: "materialSampleName",
      accessor: "data.attributes.materialSampleName",
      sortMethod: (a: any, b: any): number => {
        return compareByStringAndNumber(a, b);
      },
      isKeyword: true
    },
    {
      accessor: "data.attributes.materialSampleType",
      label: "materialSampleType",
      isKeyword: true
    },
    dateCell("createdOn", "data.attributes.createdOn"),
    stringArrayCell("tags", "data.attributes.tags"),
    {
      Cell: ({ original: { id, data } }) => (
        <div className="d-flex">
          <EditButton
            className="mx-2"
            entityId={id as string}
            entityLink="collection/material-sample"
            style={{ width: "5rem" }}
          />
          <SplitMaterialSampleDropdownButton
            ids={[id]}
            disabled={!data?.attributes?.materialSampleName}
            materialSampleType={data?.attributes?.materialSampleType}
          />
          <DeleteButton
            id={id as string}
            options={{ apiBaseUrl: "/collection-api" }}
            type="material-sample"
            reload={true}
          />
        </div>
      ),
      label: "actions",
      sortable: false
    }
  ];

  const ELASTIC_SEARCH_COLUMN_CHILDREN_VIEW8: TableColumn8<MaterialSample>[] = [
    {
      cell: ({ row: { original } }) => (
        <Link href={`/collection/material-sample/view?id=${original.id}`}>
          <a>
            {(original as any).data?.attributes?.materialSampleName ||
              (
                original as any
              ).data?.attributes?.dwcOtherCatalogNumbers?.join?.(", ") ||
              original.id}
          </a>
        </Link>
      ),
      header: () => <FieldHeader name="materialSampleName" />,
      accessorKey: "data.attributes.materialSampleName",
      sortingFn: (a: any, b: any): number => {
        return compareByStringAndNumber(a, b);
      },
      isKeyword: true
    },
    {
      accessorKey: "data.attributes.materialSampleType",
      header: () => <FieldHeader name="materialSampleType" />,
      isKeyword: true
    },
    dateCell8("createdOn", "data.attributes.createdOn"),
    stringArrayCell8("tags", "data.attributes.tags"),
    {
      id: "action",
      cell: ({ row: { original } }) => (
        <div className="d-flex">
          <EditButton
            className="mx-2"
            entityId={original.id as string}
            entityLink="collection/material-sample"
            style={{ width: "5rem" }}
          />
          <SplitMaterialSampleDropdownButton
            ids={[original.id ?? "unknown"]}
            disabled={!(original as any).data?.attributes?.materialSampleName}
            materialSampleType={
              (original as any).data?.attributes?.materialSampleType
            }
          />
          <DeleteButton
            id={original.id as string}
            options={{ apiBaseUrl: "/collection-api" }}
            type="material-sample"
            reload={true}
          />
        </div>
      ),
      header: () => <FieldHeader name="actions" />,
      enableSorting: false
    }
  ];

  return {
    ELASTIC_SEARCH_COLUMN,
    ELASTIC_SEARCH_COLUMN8,
    ELASTIC_SEARCH_COLUMN_CHILDREN_VIEW,
    ELASTIC_SEARCH_COLUMN_CHILDREN_VIEW8
  };
}
