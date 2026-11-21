"use client";

import type { SchematicType } from "@/data/projects";
import { QuantMonteCarloSchematic } from "./QuantMonteCarloSchematic";
import {
  CryptoWealthSchematic,
  EcommerceSchematic,
  FortressSchematic,
  KoridorSchematic,
  StitchRetailSchematic,
} from "./SystemsSchematics";

interface ProjectSchematicProps {
  type: SchematicType;
  compact?: boolean;
}

export function ProjectSchematic({
  type,
  compact = false,
}: ProjectSchematicProps) {
  switch (type) {
    case "koridor":
      return <KoridorSchematic compact={compact} />;
    case "fortress":
      return <FortressSchematic compact={compact} />;
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
