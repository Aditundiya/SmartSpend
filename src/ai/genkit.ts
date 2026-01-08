
/**
 * @fileOverview Initializes and configures Genkit for the application.
 * Exports the global `ai` instance.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {enableFirebaseTelemetry} from '@genkit-ai/firebase'; // Genkit Firebase plugin for GCP integration

// Firebase telemetry disabled to avoid Google Cloud authentication errors
// enableFirebaseTelemetry();

// Initialize Genkit with the Google AI plugin.
// The Firebase plugin helps with operational aspects if deploying to Firebase/GCP.
export const ai = genkit({
  plugins: [
    googleAI(),
    // If other specific Firebase functionalities (like Firestore store) were needed
    // and provided by a different plugin constructor from @genkit-ai/firebase,
    // that would be added here. For now, telemetry is handled by the call above.
  ],
  // Flow state is not persisted by default. To persist flow state, configure a flow state store.
  // For example, to persist flow state in Firestore:
  // flowStateStore: 'firestore', // Requires a firebase() plugin providing this store and Firestore setup.
  // traceStore: 'firestore', // To persist traces to Firestore, requires a suitable firebase() plugin.
  // enableTracing: true, // To enable tracing
});
