import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';

/**
 * Preset corporativo Banco Nacional de Bolivia (BNB)
 * Color primario institucional: #26b460 (Verde BNB)
 * Acentos y contraste: Morado tokenizado (#5b21b6 / #4c1d95)
 */
export const BnbPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ecfdf3',
      100: '#d1fae1',
      200: '#a7f3c6',
      300: '#6ee7a4',
      400: '#34d37c',
      500: '#26b460', // Verde Principal BNB
      600: '#1f9750',
      700: '#1a7942',
      800: '#185f36',
      900: '#154e2e',
      950: '#062c17',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.500}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.800}',
        },
      },
    },
  },
});
