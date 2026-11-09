# S1-PR11 — Show current weather from Open-Meteo

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 11
- Ticket type: Story

## Overview

Implement the `weather.home` adapter using Node's native fetch and map the
Open-Meteo current-weather response into the fixed scene data contract. Add the
weather module to the first-display example scene without introducing an SDK or
persisted source cache.

---

## Implementation Steps

### Backend

1. [ ] Write AT-W01 through AT-W05 with an injected fetch implementation before
       adapter code. Cover request URL fields, every supported weather-code
       family, unknown code, malformed body, HTTP error, timeout and config.
2. [ ] Add `WEATHER_LATITUDE` and `WEATHER_LONGITUDE` parsing in
       `apps/hub/src/config/weather.ts`. Require finite latitude `-90..90` and
       longitude `-180..180` only when an assigned scene references
       `weather.home`; errors name variables but not raw values.
3. [ ] Add `apps/hub/src/sources/open-meteo-response.ts` with a strict response
       schema for only current temperature, apparent temperature, weather code
       and observation time. Reject missing/non-finite values.
4. [ ] Add `apps/hub/src/sources/weather-icons.ts` as an exhaustive WMO-code to
       protocol icon-token mapper. Map unknown numeric codes to
       `weather-unknown` while rejecting malformed code values.
5. [ ] Add `apps/hub/src/sources/open-meteo-adapter.ts`. Build the HTTPS URL with
       `URL`/`URLSearchParams`, request only required current fields in Celsius,
       use the runner's abort signal/10-second timeout and validate before mapping.
6. [ ] Register `weather.home` with a 15-minute refresh interval and 30-minute
       freshness. Return numeric temperatures, supported icon token and parsed
       observation time in a plain JSON object matching scene data paths.
7. [ ] Add `examples/scenes/first-display.json` with a local clock module and a
       weather module bound to `weather.home`, using only PR3 component tokens.
       Validate this fixture in a test and through the scene CLI path.
8. [ ] Add a hub integration test that assigns the example scene, subscribes one
       ready display, receives mapped weather, then verifies cached/failure
       behavior through the PR10 runner.
9. [ ] Run source, scene and display tests, then `pnpm check`.

---

## Acceptance Tests Covered

- **AT-W01:** Given configured coordinates and an active subscriber, when weather
  fetches, then the request contains only the required Open-Meteo current fields
  and no credential.
- **AT-W02:** Given a valid Open-Meteo response, when mapped, then numeric
  temperatures, observation time and a supported icon token are emitted.
- **AT-W03:** Given an unknown weather code, when mapped, then a neutral fallback
  icon token is emitted rather than rejecting otherwise valid data.
- **AT-W04:** Given an HTTP error or malformed response, when fetched, then the
  shared source failure behavior applies.
- **AT-W05:** Given missing or invalid coordinates while the source is referenced,
  when the hub starts, then configuration fails clearly.

---

## Edge Cases & Error Handling

- **Unknown WMO code:** Emit `weather-unknown`; preserve otherwise valid
  temperature/time data.
- **HTTP success with API error body:** Response schema rejects it and the shared
  runner applies initial/cached failure behavior.
- **Coordinate variables exist but source is unused:** Do not block hub startup;
  validate them when source configuration is required.
- **Observation timezone:** Request/retain a machine-readable time and normalize
  it to the source contract without using host-local timezone assumptions.

---

## Security Considerations

- **Authentication and authorization:** Open-Meteo requires no credential; only
  ready subscribed displays receive mapped data.
- **Input validation:** Geographic config and provider JSON are validated before
  URL construction/cache entry.
- **Sensitive data exposure:** Request contains coordinates but no credentials;
  safe failures omit full URLs and response bodies.
- **Audit logging:** Record provider/source ID, status category and duration, not
  coordinates or response payload by default.
