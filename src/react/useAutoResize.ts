import { useEffect, RefObject } from "react";
import { App } from "../app";

/**
 * Custom hook that automatically reports size changes to the parent window.
 *
 * @param client - MCP UI client for sending size notifications
 */
export function useAutoResize(
  app: App | null,
  elementRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!app) {
      return;
    }

    return app.setupSizeChangeNotifications();
  }, [app, elementRef]);
}
