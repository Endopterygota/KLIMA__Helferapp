import { createRoot } from "react-dom/client";
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { WorkspaceRouteShell } from "../src/components/climate-workspace";
import "../src/styles.css";

const rootRoute = createRootRoute({ component: WorkspaceRouteShell });
const pages = [
  ["/", "overview"],
  ["/szenarien", "scenarios"],
  ["/vergleich", "comparison"],
  ["/daten", "data"],
  ["/berichte", "reports"],
  ["/einstellungen", "settings"],
] as const;
const routeTree = rootRoute.addChildren(
  pages.map(([path, view]) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  ),
);
const router = createRouter({ routeTree, history: createHashHistory() });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
