import { Form, Formik, FormikActions } from "formik";
import { SingletonRouter, withRouter } from "next/router";
import { useContext } from "react";
import { ApiClientContext } from "../components/api-client/ApiClientContext";
import { Query } from "../components/api-client/Query";
import { ResourceSelectField } from "../components/formik-input/ResourceSelectField";
import { SelectField } from "../components/formik-input/SelectField";
import { TextField } from "../components/formik-input/TextField";
import Head from "../components/head";
import Nav from "../components/nav";
import { Group } from "../types/seqdb-api/resources/Group";
import { PcrPrimer } from "../types/seqdb-api/resources/PcrPrimer";
import { serialize } from "../util/serialize";

interface PcrPrimerFormProps {
  primer?: PcrPrimer;
  router: SingletonRouter;
}

export default withRouter(function AddPcrPrimerPage({ router }) {
  const { id } = router.query;

  return (
    <div>
      <Head title="Edit PCR Primer" />
      <Nav />
      <div className="container-fluid">
        {id ? (
          <div>
            <h1>Edit PCR Primer</h1>
            <Query<PcrPrimer>
              query={{ include: "group", path: `pcrPrimer/${id}` }}
            >
              {({ loading, response }) => (
                <div>
                  {loading && (
                    <div className="spinner-border" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                  )}
                  {response && (
                    <PcrPrimerForm primer={response.data} router={router} />
                  )}
                </div>
              )}
            </Query>
          </div>
        ) : (
          <div>
            <h1>Add PCR Primer</h1>
            <PcrPrimerForm router={router} />
          </div>
        )}
      </div>
    </div>
  );
});

function PcrPrimerForm({ primer, router }: PcrPrimerFormProps) {
  const { doOperations } = useContext(ApiClientContext);

  const initialValues = primer || { lotNumber: 1, seq: "", type: "PRIMER" };

  async function onSubmit(
    submittedValues,
    { setStatus, setSubmitting }: FormikActions<any>
  ) {
    try {
      const serialized = await serialize({
        resource: submittedValues,
        type: "pcrPrimer"
      });

      const op = submittedValues.id ? "PATCH" : "POST";

      if (op === "POST") {
        serialized.id = -100;
      }

      const response = await doOperations([
        {
          op,
          path: op === "PATCH" ? `pcrPrimer/${primer.id}` : "pcrPrimer",
          value: serialized
        }
      ]);

      const newId = response[0].data.id;
      router.push(`/pcr-primer?id=${newId}`);
    } catch (error) {
      setStatus(error);
      setSubmitting(false);
    }
  }

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {({ status, isSubmitting }) => (
        <Form>
          {status && <div className="alert alert-danger">{status}</div>}
          <div>
            <div className="row">
              <ResourceSelectField<Group>
                className="col-md-2"
                field="group"
                filter={groupName => ({ groupName })}
                model="group"
                optionLabel={group => group.groupName}
              />
              <SelectField
                className="col-md-2"
                field="type"
                label="Primer Type"
                options={PRIMER_TYPE_OPTIONS}
              />
              <TextField className="col-md-2" field="name" />
              <TextField className="col-md-2" field="lotNumber" />
            </div>
            {isSubmitting ? (
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            ) : (
              <button className="btn btn-primary" type="submit">
                Submit
              </button>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );
}

const PRIMER_TYPE_OPTIONS = [
  {
    label: "PCR Primer",
    value: "PRIMER"
  },
  {
    label: "454 Multiplex Identifier",
    value: "MID"
  },
  {
    label: "Fusion Primer",
    value: "FUSION_PRIMER"
  },
  {
    label: "Illumina Index",
    value: "ILLUMINA_INDEX"
  },
  {
    label: "iTru Primer",
    value: "ITRU_PRIMER"
  }
];
