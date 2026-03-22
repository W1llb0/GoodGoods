import './styles/global.css';
import { mountApp } from './ui/app-shell';

const root: HTMLElement | null = document.querySelector('#app');
if (root !== null) {
  mountApp(root);
}
