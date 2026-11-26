"use client";

import { getProjectBySlug, type SchematicType } from "@/data/projects";
import { QuantMonteCarloSchematic } from "./QuantMonteCarloSchematic";
import {
  CryptoWealthSchematic,
  EcommerceSchematic,
  FortressSchematic,
  GGravitatorSchematic,
  KoridorSchematic,
  StitchRetailSchematic,
} from "./SystemsSchematics";

export type SchematicTheme = "light" | "marine";

export type ProjectSchematicProps =
  | {
      type: SchematicType;
      slug?: string;
      compact?: boolean;
      theme?: SchematicTheme;
    }
  | {
      slug: string;
      type?: SchematicType;
      compact?: boolean;
      theme?: SchematicTheme;
    };

const SLUG_TO_SCHEMATIC: Record<string, SchematicType> = {
  "g-gravitator": "g-gravitator",
  ggravitator: "g-gravitator",
  "g-gravitator-lab": "g-gravitator",
  koridor: "koridor",
  "koridor-engine-os": "koridor",
  fortress: "fortress",
  "fortress-fleet-ai": "fortress",
  "crypto-wealth": "crypto-wealth",
  "institutional-crypto-wealth": "crypto-wealth",
  "crypto-wealth-management-platform": "crypto-wealth",
  "stitch-retail": "stitch-retail",
  "stitch-retail-operations-os": "stitch-retail",
  "stitch-retail-inventory-os": "stitch-retail",
  "quant-hft": "quant-hft",
  "quant-forex-crypto-hft": "quant-hft",
  ecommerce: "ecommerce",
  "production-ecommerce-builds": "ecommerce",
  "ecommerce-brand-architecture": "ecommerce",
};

function resolveSchematicType(
  type?: SchematicType,
  slug?: string
): SchematicType {
  if (type) return type;
  if (slug) {
    const project = getProjectBySlug(slug);
    if (project) return project.schematicType;
    const mapped = SLUG_TO_SCHEMATIC[slug];
    if (mapped) return mapped;
  }
  return "koridor";
}

export function ProjectSchematic({
  type,
  slug,
  compact = false,
  theme = "light",
}: ProjectSchematicProps) {
  const resolved = resolveSchematicType(type, slug);

  switch (resolved) {
    case "g-gravitator":
      return <GGravitatorSchematic compact={compact} />;
    case "koridor":
      return <KoridorSchematic compact={compact} />;
    case "fortress":
      return <FortressSchematic compact={compact} theme={theme} />;
    case "crypto-wealth":
      return <CryptoWealthSchematic compact={compact} />;
    case "stitch-retail":
      return <StitchRetailSchematic compact={compact} />;
    case "quant-hft":
      return <QuantMonteCarloSchematic compact={compact} />;
    case "ecommerce":
      return <EcommerceSchematic compact={compact} />;
  }
}
