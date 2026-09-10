import assert from "node:assert/strict";
import test from "node:test";
import { assertAdjudicationIntake } from "../lib/adjudication-intake.mjs";
import { evaluateForecastCohort } from "../lib/evaluation.mjs";

const claim = (name) => ({ status: "void", provenance: { author: "Ren" },
  history: [{ actor: "Original issuer" }], resolution: { adjudication: { claimed_adjudicator_id: name } } });

test("adjudication intake rejects spaced punctuated and embedded author or issuer claims", () => {
  for (const name of ["R e n", "ren.", "REN (Ren)", "Ren_", "Ren2", "prefix-Ren-suffix", "Original_issuer.", "R\u0435n.", " . _ "]) {
    assert.throws(() => assertAdjudicationIntake(claim(name)), /adjudicator.*(identity|forecaster)/i);
    assert.throws(() => evaluateForecastCohort({}, [claim(name)]), /adjudicator.*(identity|forecaster)/i);
  }
});

test("distinct strings do not prove an appointment or independent identity", () => {
  assert.deepEqual(assertAdjudicationIntake(claim("Maya")), {
    appointment_verified: false, identity_authenticated: false,
  });
});

test("adjudication intake folds composed and decomposed combining marks before punctuation", () => {
  for (const name of ["Rén", "Re\u0301n", "R.é n", "Ṙẹn", "\u0301", "Original íssuer"]) {
    assert.throws(() => assertAdjudicationIntake(claim(name)), /adjudicator.*(identity|forecaster)/i);
  }
  const accentedAuthor = claim("Ren");
  accentedAuthor.provenance.author = "Rén";
  assert.throws(() => assertAdjudicationIntake(accentedAuthor), /forecaster/);
});
