import { ConnectorManager } from "./core/connector-manager";
import { WhatsAppConnector } from "./whatsapp/whatsapp-connector";
import { OrderConnector } from "./pharmacy/order-connector";
import { InventoryConnector } from "./pharmacy/inventory-connector";
import { CustomerConnector } from "./pharmacy/customer-connector";
import { N8NBridge } from "./n8n/n8n-bridge";
import { IntelligenceConnector } from "./analytics/intelligence-connector";

/**
 * World Integration Bootstrap — every connected system registers here.
 * The sun-tick worker and health-check route both import `world`.
 */
export const world = new ConnectorManager();

world.register(new WhatsAppConnector());
world.register(new OrderConnector());
world.register(new InventoryConnector());
world.register(new CustomerConnector());
world.register(new N8NBridge());
world.register(new IntelligenceConnector());
