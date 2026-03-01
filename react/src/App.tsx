import { useState, useCallback, useEffect } from "react";
import { OpenID4VPVerification } from "@mosip/react-inji-verify-sdk";
import type {
  VerificationResults,
  AppError,
  PresentationDefinition,
} from "@mosip/react-inji-verify-sdk/dist/components/openid4vp-verification/OpenID4VPVerification.types";

// Cast needed because the SDK types `constraints` as `{}` but the backend
// expects the full OpenID4VP constraints structure with fields/filter.
const PRESENTATION_DEFINITION = {
  id: "eca-age-verification",
  purpose:
    "Verificação de idade conforme o Estatuto da Criança e do Adolescente",
  format: { ldp_vc: { proof_type: ["Ed25519Signature2020"] } },
  input_descriptors: [
    {
      id: "eca credential",
      format: { ldp_vc: { proof_type: ["Ed25519Signature2020"] } },
      constraints: {
        fields: [
          {
            path: ["$.type"],
            filter: { type: "object", pattern: "ECACredential" },
          },
        ],
      },
    },
  ],
} as unknown as PresentationDefinition;

// Intercept fetch to log requestId from vp-request responses,
// so we can run the wallet simulation scripts.
function installFetchInterceptor() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
    if (url.includes("/vp-request") && !url.includes("/status")) {
      response.clone().json().then((data) => {
        if (data.requestId) {
          console.log("requestId:", data.requestId, "transactionId:", data.transactionId);
        }
      }).catch(() => {});
    }
    return response;
  };
}

type AppState = "idle" | "verifying" | "expired" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    installFetchInterceptor();
  }, []);

  const handleVPProcessed = useCallback((results: VerificationResults) => {
    const result = results[0];
    if (!result) {
      window.location.href = "/nao/";
      return;
    }

    const vc = result.vc as Record<string, unknown>;
    const subject = vc.credentialSubject as Record<string, unknown> | undefined;
    const status = result.vcStatus as string;
    const isValid = status === "valid" || status === "SUCCESS";
    const isOver18 = subject?.isOver18 === true;

    if (isValid && isOver18) {
      window.location.href = "/conteudo_adulto/";
    } else {
      window.location.href = "/nao/";
    }
  }, []);

  const handleExpired = useCallback(() => {
    setState("expired");
  }, []);

  const handleError = useCallback((error: AppError) => {
    setErrorMsg(error.errorMessage || "Erro na verificação");
    setState("error");
  }, []);

  const startVerification = () => {
    setState("verifying");
    setErrorMsg("");
  };

  const retry = () => {
    setState("idle");
    setErrorMsg("");
  };

  return (
    <div className="container">
      {state === "idle" && (
        <>
          <h1>Maior de 18 anos?</h1>
          <button className="btn" onClick={startVerification}>
            Verificar
          </button>
        </>
      )}

      {state === "verifying" && (
        <>
          <h1>Maior de 18 anos?</h1>
          <p className="status-text">Escaneie o QR code com sua carteira digital</p>
          <OpenID4VPVerification
            verifyServiceUrl="/v1/verify"
            clientId={window.location.origin}
            presentationDefinition={PRESENTATION_DEFINITION}
            onVPProcessed={handleVPProcessed}
            onQrCodeExpired={handleExpired}
            onError={handleError}
            qrCodeStyles={{ size: 200 }}
          />
        </>
      )}

      {state === "expired" && (
        <>
          <p className="warning">QR code expirado</p>
          <button className="btn btn--outline" onClick={retry}>
            Tentar novamente
          </button>
        </>
      )}

      {state === "error" && (
        <>
          <p className="warning">{errorMsg}</p>
          <button className="btn btn--outline" onClick={retry}>
            Tentar novamente
          </button>
        </>
      )}
    </div>
  );
}
