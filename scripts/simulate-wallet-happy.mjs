/**
 * Simulates a wallet submitting a signed ECACredential VP to the verify-service.
 *
 * Usage:
 *   node simulate-wallet-happy.mjs <requestId>
 *
 * The script:
 *   1. Generates an Ed25519 keypair and did:key
 *   2. Issues a signed ECACredential with isOver18: true
 *   3. Wraps it in a VerifiablePresentation
 *   4. Submits to the verify-service direct-post endpoint
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
  console.error("Usage: node simulate-wallet-happy.mjs <requestId>");
  console.error("  Env: CONTEXT_PORT=<port> (default: 5500, the Caddy port serving eca-context.jsonld)");
  process.exit(1);
}

// -- Custom document loader --
// The VC libraries need to resolve JSON-LD contexts and DIDs.
// We provide a minimal loader that handles the contexts we need.

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

// ECA context (same content as perna/eca-context.jsonld)
CONTEXTS[`http://host.docker.internal:${CONTEXT_PORT}/eca-context.jsonld`] = {
  "@context": {
    ECACredential: "https://example.org/eca#ECACredential",
    isOver18: "https://example.org/eca#isOver18",
  },
};

function documentLoader(url) {
  // Serve known contexts
  if (CONTEXTS[url]) {
    return {
      contextUrl: null,
      document: CONTEXTS[url],
      documentUrl: url,
    };
  }

  // Resolve did:key
  if (url.startsWith("did:key:")) {
    const didParts = url.split("#");
    const did = didParts[0];
    const fingerprint = did.replace("did:key:", "");

    const didDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
      id: did,
      verificationMethod: [
        {
          id: `${did}#${fingerprint}`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: fingerprint,
        },
      ],
      authentication: [`${did}#${fingerprint}`],
      assertionMethod: [`${did}#${fingerprint}`],
    };

    return {
      contextUrl: null,
      document: didDocument,
      documentUrl: url,
    };
  }

  // DID context
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
  console.log("Generating Ed25519 keypair...");

  // Generate key
  const keyPair = await Ed25519VerificationKey2020.generate();
  const fingerprint = keyPair.fingerprint();
  const did = `did:key:${fingerprint}`;
  keyPair.id = `${did}#${fingerprint}`;
  keyPair.controller = did;

  console.log("DID:", did);
  console.log("Key ID:", keyPair.id);

  // Create the suite for signing
  const suite = new Ed25519Signature2020({ key: keyPair });

  // ECA context served by the webapp; Docker containers access it via host.docker.internal
  const ECA_CONTEXT_URL = `http://host.docker.internal:${CONTEXT_PORT}/eca-context.jsonld`;

  // Create credential with inline context for ECA terms
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
      id: "did:example:holder123",
      isOver18: true,
    },
  };

  console.log("Signing credential...");
  const signedVC = await vc.issue({
    credential,
    suite,
    documentLoader,
  });
  console.log("Signed VC:", JSON.stringify(signedVC, null, 2));

  // Wrap in a VP (unsigned — the verify-service accepts unsigned VPs)
  const vp = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [signedVC],
  };

  const presentationSubmission = {
    id: "eca-submission",
    definition_id: "eca-age-verification",
    descriptor_map: [
      {
        id: "eca credential",
        format: "ldp_vc",
        path: "$.verifiableCredential[0]",
      },
    ],
  };

  // Submit to verify-service
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
    console.log("\nDone! The polling in the webapp should detect VP_SUBMITTED now.");
    console.log("Since the credential is self-signed with a valid Ed25519 proof,");
    console.log("the verification status should be VALID if the service can resolve did:key.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
