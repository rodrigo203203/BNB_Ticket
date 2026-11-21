import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';

/**
 * Fuerza la inclusión de estilos Aura de overlays en el bundle principal (antes de rutas lazy).
 * Sin esto, Select/MultiSelect pueden abrir el panel antes de que el chunk inyecte CSS (overlay transparente).
 */
export const primeOverlayComponents = [Select, MultiSelect, DatePicker, Dialog] as const;