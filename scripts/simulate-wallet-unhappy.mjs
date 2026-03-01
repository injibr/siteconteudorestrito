/**
 * Simulates a wallet submitting a signed ECACredential VP with isOver18: false.
 * This is the unhappy path — valid signature but the subject is NOT over 18.
 * The webapp should redirect to /nao/.
 *
 * Usage:
 *   node simulate-wallet-unhappy.mjs <requestId>
 */

import * as Ed25519Multikey from "@digitalbazaar/ed25519-multikey";
import { Ed25519Signature2020 } from "@digitalbazaar/ed25519-signature-2020";
import {
  Ed25519VerificationKey2020,
} from "@digitalbazaar/ed25519-verification-key-2020";
import * as vc from "@digitalbazaar/vc";

// -- Config --
const VERIFY_SERVICE_URL =
  process.env.VERIFY_SERVICE_URL || "http://localhost:8080/v1/verify";
const REQUEST_ID = process.argv[2];
const CONTEXT_PORT = process.env.CONTEXT_PORT || "5500";

if (!REQUEST_ID) {
  console.error("Usage: node simulate-wallet-unhappy.mjs <requestId>");
  console.error("  Env: CONTEXT_PORT=<port> (default: 5500, the Caddy port serving eca-context.jsonld)");
  process.exit(1);
}

// -- Custom document loader --
const CONTEXTS = {
  "https://www.w3.org/2018/credentials/v1": {
    "@context": {
      "@version": 1.1,
      "@protected": true,
      id: "@id",
      type: "@type",
      VerifiableCredential: {
        "@id": "https://www.w3.org/2018/credentials#VerifiableCredential",
        "@context": { "@version": 1.1, "@protected": true },
      },
      VerifiablePresentation: {
        "@id": "https://www.w3.org/2018/credentials#VerifiablePresentation",
        "@context": { "@version": 1.1, "@protected": true },
      },
      id: "@id",
      type: "@type",
      issuer: {
        "@id": "https://www.w3.org/2018/credentials#issuer",
        "@type": "@id",
      },
      issuanceDate: {
        "@id": "https://www.w3.org/2018/credentials#issuanceDate",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      credentialSubject: {
        "@id": "https://www.w3.org/2018/credentials#credentialSubject",
        "@type": "@id",
      },
      verifiableCredential: {
        "@id": "https://www.w3.org/2018/credentials#verifiableCredential",
        "@type": "@id",
        "@container": "@graph",
      },
      proof: {
        "@id": "https://w3id.org/security#proof",
        "@type": "@id",
        "@container": "@graph",
      },
    },
  },
  "https://w3id.org/security/suites/ed25519-2020/v1": {
    "@context": {
      "@version": 1.1,
      "@protected": true,
      id: "@id",
      type: "@type",
      Ed25519Signature2020: {
        "@id": "https://w3id.org/security#Ed25519Signature2020",
        "@context": {
          "@version": 1.1,
          "@protected": true,
          id: "@id",
          type: "@type",
          challenge: "https://w3id.org/security#challenge",
          created: {
            "@id": "http://purl.org/dc/terms/created",
            "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
          },
          domain: "https://w3id.org/security#domain",
          expires: {
            "@id": "https://w3id.org/security#expiration",
            "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
          },
          nonce: "https://w3id.org/security#nonce",
          proofPurpose: {
            "@id": "https://w3id.org/security#proofPurpose",
            "@type": "@vocab",
            "@context": {
              "@version": 1.1,
              "@protected": true,
              id: "@id",
              type: "@type",
              assertionMethod: {
                "@id": "https://w3id.org/security#assertionMethod",
                "@type": "@id",
                "@container": "@set",
              },
              authentication: {
                "@id": "https://w3id.org/security#authenticationMethod",
                "@type": "@id",
                "@container": "@set",
              },
            },
          },
          proofValue: {
            "@id": "https://w3id.org/security#proofValue",
          },
          verificationMethod: {
            "@id": "https://w3id.org/security#verificationMethod",
            "@type": "@id",
          },
        },
      },
      Ed25519VerificationKey2020: {
        "@id": "https://w3id.org/security#Ed25519VerificationKey2020",
        "@context": {
          "@version": 1.1,
          "@protected": true,
          id: "@id",
          type: "@type",
          controller: {
            "@id": "https://w3id.org/security#controller",
            "@type": "@id",
          },
          publicKeyMultibase: {
            "@id": "https://w3id.org/security#publicKeyMultibase",
          },
        },
      },
    },
  },
};

// ECA context (same content as perna/vanillajs/eca-context.jsonld)
CONTEXTS[`http://host.docker.internal:${CONTEXT_PORT}/eca-context.jsonld`] = {
  "@context": {
    ECACredential: "https://example.org/eca#ECACredential",
    isOver18: "https://example.org/eca#isOver18",
  },
};

function documentLoader(url) {
  if (CONTEXTS[url]) {
    return { contextUrl: null, document: CONTEXTS[url], documentUrl: url };
  }

  if (url.startsWith("did:key:")) {
    const did = url.split("#")[0];
    const fingerprint = did.replace("did:key:", "");
    return {
      contextUrl: null,
      document: {
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
        id: did,
        verificationMethod: [{
          id: `${did}#${fingerprint}`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: fingerprint,
        }],
        authentication: [`${did}#${fingerprint}`],
        assertionMethod: [`${did}#${fingerprint}`],
      },
      documentUrl: url,
    };
  }

  if (url === "https://www.w3.org/ns/did/v1") {
    return {
      contextUrl: null,
      document: {
        "@context": {
          "@protected": true,
          id: "@id",
          type: "@type",
          verificationMethod: {
            "@id": "https://w3id.org/security#verificationMethod",
            "@type": "@id",
            "@container": "@set",
          },
          authentication: {
            "@id": "https://w3id.org/security#authenticationMethod",
            "@type": "@id",
            "@container": "@set",
          },
          assertionMethod: {
            "@id": "https://w3id.org/security#assertionMethod",
            "@type": "@id",
            "@container": "@set",
          },
          controller: {
            "@id": "https://w3id.org/security#controller",
            "@type": "@id",
          },
          publicKeyMultibase: {
            "@id": "https://w3id.org/security#publicKeyMultibase",
          },
        },
      },
      documentUrl: url,
    };
  }

  throw new Error(`Unable to load document: ${url}`);
}

// -- Main --
async function main() {
  console.log("[UNHAPPY PATH] Generating Ed25519 keypair...");

  const keyPair = await Ed25519VerificationKey2020.generate();
  const fingerprint = keyPair.fingerprint();
  const did = `did:key:${fingerprint}`;
  keyPair.id = `${did}#${fingerprint}`;
  keyPair.controller = did;

  console.log("DID:", did);

  const suite = new Ed25519Signature2020({ key: keyPair });

  const ECA_CONTEXT_URL = `http://host.docker.internal:${CONTEXT_PORT}/eca-context.jsonld`;

  // Credential with isOver18: FALSE
  const credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      ECA_CONTEXT_URL,
    ],
    type: ["VerifiableCredential", "ECACredential"],
    issuer: did,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: "did:example:minor456",
      isOver18: false,
    },
  };

  console.log("Signing credential (isOver18: false)...");
  const signedVC = await vc.issue({
    credential,
    suite,
    documentLoader,
  });
  console.log("Signed VC:", JSON.stringify(signedVC, null, 2));

  const vp = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [signedVC],
  };

  const presentationSubmission = {
    id: "eca-submission",
    definition_id: "eca-age-verification",
    descriptor_map: [{
      id: "eca credential",
      format: "ldp_vc",
      path: "$.verifiableCredential[0]",
    }],
  };

  console.log(`\nSubmitting VP to verify-service (state=${REQUEST_ID})...`);

  const body = new URLSearchParams();
  body.set("vp_token", JSON.stringify(vp));
  body.set("presentation_submission", JSON.stringify(presentationSubmission));
  body.set("state", REQUEST_ID);

  const res = await fetch(
    `${VERIFY_SERVICE_URL}/vp-submission/direct-post`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  const resText = await res.text();
  console.log(`Response: ${res.status} ${resText}`);

  if (res.ok) {
    console.log("\nDone! The credential is valid but isOver18 is false.");
    console.log("The webapp should redirect to /nao/.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
