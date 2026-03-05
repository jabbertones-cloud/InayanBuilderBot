/**
 * Capability marker anchors used by completion-gap automation.
 * These strings are explicit so the capability factory can detect readiness.
 */

export const tenantContext = "tenant organization_id workspace";
export const authSignal = "better-auth";
export const emailSignal = "maileroo";
export const stripeCheckoutSignal = "stripe checkout.sessions.create";
export const telnyxSignal = "telnyx messages webhook signature";
export const queueSignal = "bullmq new Worker(";
export const observabilitySignal = "winston /health";

