import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faBars,
  faRotate,
  faSpinner,
  faFolder,
  faClock,
  faCircleCheck,
  faCircleXmark,
  faClipboardList,
  faMagnifyingGlassChart,
  faListCheck,
  faTrophy,
  faTriangleExclamation,
  faLayerGroup,
  faUsers,
  faShieldHalved,
  faDatabase,
  faUserLock,
  faLaptop,
  faDisplay,
  faBan,
  faCompass,
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faCircleExclamation,
  faRightFromBracket,
  faChartPie,
  faTicket,
  faMagnifyingGlass,
  faPlus,
  faUser,
  faTableColumns,
  faUserPlus,
  faComment,
  faArrowLeft,
  faCheck,
  faXmark,
  faKey,
  faPen,
  faFileCsv,
  faDownload,
  faCamera,
  faGripVertical,
  faTrashCan,
  faImage,
} from '@fortawesome/free-solid-svg-icons';

import App from './App.vue';
import { router } from './router';
import { BnbPreset } from './theme/bnb-preset';
import './assets/main.css';
import './assets/responsive.css';

// Registro de iconos FontAwesome requeridos
library.add(
  faBars,
  faRotate,
  faSpinner,
  faFolder,
  faClock,
  faCircleCheck,
  faCircleXmark,
  faClipboardList,
  faMagnifyingGlassChart,
  faListCheck,
  faTrophy,
  faTriangleExclamation,
  faLayerGroup,
  faUsers,
  faShieldHalved,
  faDatabase,
  faUserLock,
  faLaptop,
  faDisplay,
  faBan,
  faCompass,
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faCircleExclamation,
  faRightFromBracket,
  faChartPie,
  faTicket,
  faMagnifyingGlass,
  faPlus,
  faUser,
  faTableColumns,
  faUserPlus,
  faComment,
  faArrowLeft,
  faCheck,
  faXmark,
  faKey,
  faPen,
  faFileCsv,
  faDownload,
  faCamera,
  faGripVertical,
  faTrashCan,
  faImage,
);

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: BnbPreset,
    options: {
      prefix: 'p',
      darkModeSelector: 'none',
      cssLayer: false,
    },
  },
});
app.use(ToastService);
app.use(ConfirmationService);

app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');
