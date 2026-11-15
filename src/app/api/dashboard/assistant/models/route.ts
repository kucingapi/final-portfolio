import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { openRouterModels } from "@/lib/dashboard/assistant";

/**
 * Every model OpenRouter serves, with live prices, for the model picker. When OpenRouter can't be reached
 * the picker still offers the suggested models by name, without prices.
 */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  try {
    return Response.json({ models: await openRouterModels() }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    console.error("assistant: no model list", e);
    return Response.json({ models: [], error: "Couldn't load OpenRouter's model list, so prices aren't shown." }, { headers: { "Cache-Control": "no-store" } });
  }
}
