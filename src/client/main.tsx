import { render } from 'preact';
import { App } from './App';
import { isKaiOS } from './kaios/env';
import { installFetch, installPolyfills } from './kaios/polyfills';
import './styles/global.scss';
import './styles/kaios.scss';

installPolyfills();
installFetch();

if (isKaiOS()) document.documentElement.classList.add('kaios');

render(<App />, document.getElementById('app')!);