# Vth Unit Live Shadow Reconstruction

This package is the non-production, side-by-side Unit reconstruction of `com.dkds.transfer-vth-lab`.

It uses the existing 41 Unit Templates only and ships no CSS. The shadow declares an explicit dependency on the production Vth plugin and connects to `com.dkds.transfer-vth-lab/live`, a dependency-gated domain adapter. Controls, metrics, the curve plot and the result table therefore consume the existing production state, `analyze-vth` Task and result cache instead of creating a second Vth store or numerical pipeline.

The production Vth presentation is intentionally still active. This package exists only to prove live state/numeric/presentation parity before production cutover.
