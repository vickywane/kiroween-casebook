"use client";

/**
 * MapClient — thin wrapper so the map import can be dynamic({ ssr: false })
 * from page.tsx without making the whole SherlockMap file a dynamic import.
 */
export { SherlockMap as default } from "./SherlockMap";
