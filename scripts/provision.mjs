import { algoliaBase, agentSpec, args, flag, indexExists, loadDotEnv, optional, provisionAgent, required, seedSupportIndex, writeProvisionedEnv } from "./provision-lib.mjs";

await loadDotEnv();
const options = args();
const applicationId = required("ALGOLIA_APPLICATION_ID");
const productIndex = required("ALGOLIA_PRODUCT_INDEX");
const supportIndex = optional("ALGOLIA_SUPPORT_INDEX", "agent_studio_support_demo");
const providerId = optional("AGENT_STUDIO_PROVIDER_ID");
const model = optional("AGENT_STUDIO_MODEL");
const publish = options.publish || flag("PUBLISH_AGENTS");
const agentKey = options.dryRun ? optional("ALGOLIA_AGENT_STUDIO_MANAGEMENT_API_KEY", "<set in .env>") : required("ALGOLIA_AGENT_STUDIO_MANAGEMENT_API_KEY");

if (options.dryRun) console.log("Dry run: no Algolia requests will be made.");
else {
  const indexingKey = required("ALGOLIA_INDEXING_API_KEY");
  const base = algoliaBase(applicationId);
  if (!(await indexExists({ base, applicationId, apiKey: indexingKey, index: productIndex }))) throw new Error(`Product index does not exist: ${productIndex}`);
  if (!options.skipIndex) await seedSupportIndex({ base, applicationId, apiKey: indexingKey, index: supportIndex, dryRun: false });
}

const base = algoliaBase(applicationId);
const specs = [
  {
    env: "SALES_AGENT_STUDIO_AGENT_ID",
    spec: agentSpec({ name: optional("SALES_AGENT_NAME", "Sales specialist"), description: "Sales-focused Agent Studio demo agent.", instructions: "Help with product and plan questions using the product catalog. If the user needs account troubleshooting or support policy information, tell the application that Support is the appropriate destination rather than attempting to answer from memory.", providerId, model, toolName: "product_search", indices: [{ index: productIndex, description: "Product catalog used for product and plan questions." }] }),
  },
  {
    env: "SUPPORT_AGENT_STUDIO_AGENT_ID",
    spec: agentSpec({ name: optional("SUPPORT_AGENT_NAME", "Support specialist"), description: "Support-focused Agent Studio demo agent.", instructions: "Help with account, billing, authentication, and troubleshooting questions using the support knowledge base. If the indexed support content does not answer the question, say what is missing instead of inventing a policy.", providerId, model, toolName: "support_search", indices: [{ index: supportIndex, description: "Support knowledge base for account, billing, authentication, and troubleshooting questions." }] }),
  },
];

const output = {};
if (!options.skipAgents) {
  for (const { env, spec } of specs) {
    const agent = await provisionAgent({ base, applicationId, apiKey: agentKey, agentId: optional(env), spec, publish, dryRun: options.dryRun });
    output[env] = agent.id;
  }
}
if (!options.dryRun) {
  await writeProvisionedEnv({ ALGOLIA_PRODUCT_INDEX: productIndex, ALGOLIA_SUPPORT_INDEX: supportIndex, SALES_AGENT_STUDIO_AGENT_ID: output.SALES_AGENT_STUDIO_AGENT_ID, SUPPORT_AGENT_STUDIO_AGENT_ID: output.SUPPORT_AGENT_STUDIO_AGENT_ID });
}
console.log(`\nNext runtime values:\nALGOLIA_PRODUCT_INDEX=${productIndex}\nALGOLIA_SUPPORT_INDEX=${supportIndex}\nSALES_AGENT_STUDIO_AGENT_ID=${output.SALES_AGENT_STUDIO_AGENT_ID || optional("SALES_AGENT_STUDIO_AGENT_ID", "<created-agent-id>")}\nSUPPORT_AGENT_STUDIO_AGENT_ID=${output.SUPPORT_AGENT_STUDIO_AGENT_ID || optional("SUPPORT_AGENT_STUDIO_AGENT_ID", "<created-agent-id>")}`);
