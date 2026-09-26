import {
  createMulberry32,
  simulateExtremes,
  SIM_EXTREMES_SEED,
  buildContext,
} from "./compute-context.mjs";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const a = createMulberry32(1)();
const b = createMulberry32(1)();
check("mulberry32 same seed same first value", a === b);
check("mulberry32 in (0,1)", a >= 0 && a < 1);

const s1 = simulateExtremes(69, 5, 100, 200, 42);
const s2 = simulateExtremes(69, 5, 100, 200, 42);
const s3 = simulateExtremes(69, 5, 100, 200, 43);
check("simulateExtremes deterministic for fixed seed", JSON.stringify(s1) === JSON.stringify(s2));
check("different seed changes output", JSON.stringify(s1) !== JSON.stringify(s3));
check("default seed constant exported", SIM_EXTREMES_SEED === 0x4c4f5454);

const ctx1 = buildContext();
const ctx2 = buildContext();
check(
  "buildContext PB maxMean stable",
  ctx1.pb.simulated.maxMean === ctx2.pb.simulated.maxMean,
);
check(
  "buildContext PB minMean stable",
  ctx1.pb.simulated.minMean === ctx2.pb.simulated.minMean,
);

console.log(
  "LOCKED  PB maxMean=",
  ctx1.pb.simulated.maxMean.toFixed(1),
  " minMean=",
  ctx1.pb.simulated.minMean.toFixed(1),
  " spreadMean=",
  ctx1.pb.simulated.spreadMean.toFixed(1),
);
console.log(
  "LOCKED  MM maxMean=",
  ctx1.mm.simulated.maxMean.toFixed(1),
  " minMean=",
  ctx1.mm.simulated.minMean.toFixed(1),
  " spreadMean=",
  ctx1.mm.simulated.spreadMean.toFixed(1),
);

if (failed) {
  console.error(`\n${failed} simulate-extremes test(s) failed`);
  process.exit(1);
}
console.log("\nAll simulate-extremes tests passed");
