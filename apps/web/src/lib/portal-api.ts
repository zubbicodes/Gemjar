"use client";

import { useCallback, useEffect, useState } from "react";
import { csrfHeaders } from "./csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      body.message || `Request failed (${response.status})`,
      response.status,
    );
  return body;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse(
    await fetch(`${API_URL}${path}`, {
      credentials: "include",
      cache: "no-store",
    }),
  );
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  return parse(
    await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: { "content-type": "application/json", ...csrfHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

/**
 * Loads a portal resource, exposing the loading and error states the UI needs.
 * Refetches whenever the path changes, so callers pass the resolved path.
 */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));

  const reload = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await apiGet<T>(path));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load this view",
      );
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
