import type { ToolRegistry } from "./core/tool-registry";
import { ProductSearchTool } from "./pharmacy/product-search.tool";
import { PrescriptionCheckTool } from "./pharmacy/prescription-check.tool";
import { DrugInfoTool } from "./pharmacy/drug-info.tool";
import { StockQueryTool } from "./inventory/stock-query.tool";
import { ReorderTool } from "./inventory/reorder.tool";
import { ExpiryScanTool } from "./inventory/expiry-scan.tool";
import { WhatsappSendTool } from "./customer/whatsapp-send.tool";
import { NotificationTool } from "./customer/notification.tool";

export function registerAllTools(registry: ToolRegistry) {
  registry.register(new ProductSearchTool());
  registry.register(new PrescriptionCheckTool());
  registry.register(new DrugInfoTool());
  registry.register(new StockQueryTool());
  registry.register(new ReorderTool());
  registry.register(new ExpiryScanTool());
  registry.register(new WhatsappSendTool());
  registry.register(new NotificationTool());
}
