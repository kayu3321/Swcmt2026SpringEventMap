const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const collectionName = process.argv[2] || "eventMapCongestionItems";
const projectId = process.env.GCLOUD_PROJECT || "swcmt2026springevent-a8d8f";
const emulatorHost = process.env.MAP_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8084";

function loadDependency(name) {
  try {
    return require(name);
  } catch (error) {
    const fallbackPackageJson = path.resolve(
      __dirname,
      "..",
      "..",
      "Swcmt2026SpringEvent",
      "functions",
      "package.json"
    );

    if (!fs.existsSync(fallbackPackageJson)) {
      throw error;
    }

    const fallbackRequire = createRequire(fallbackPackageJson);
    return fallbackRequire(name);
  }
}

const admin = loadDependency("firebase-admin");
const { Firestore } = loadDependency("@google-cloud/firestore");

function chunk(items, size) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is required.");
  }

  console.log(`[push] projectId=${projectId}`);
  console.log(`[push] emulator=${emulatorHost}`);
  console.log(`[push] collection=${collectionName}`);

  const originalEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
  const emulatorDb = new Firestore({ projectId });

  if (originalEmulatorHost === undefined) {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  } else {
    process.env.FIRESTORE_EMULATOR_HOST = originalEmulatorHost;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId
    });
  }

  const prodDb = admin.firestore();
  const emulatorSnapshot = await emulatorDb.collection(collectionName).get();

  if (emulatorSnapshot.empty) {
    console.log("[push] emulator collection is empty. nothing to upload.");
    return;
  }

  const docs = emulatorSnapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data()
  }));

  console.log(`[push] found ${docs.length} docs in emulator.`);

  const batches = chunk(docs, 400);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const writeBatch = prodDb.batch();

    batches[batchIndex].forEach((doc) => {
      writeBatch.set(
        prodDb.collection(collectionName).doc(doc.id),
        doc.data,
        { merge: true }
      );
    });

    await writeBatch.commit();
    console.log(
      `[push] committed batch ${batchIndex + 1}/${batches.length} (${batches[batchIndex].length} docs)`
    );
  }

  console.log("[push] completed successfully.");
}

main().catch((error) => {
  console.error("[push] failed:", error.message);
  process.exitCode = 1;
});
