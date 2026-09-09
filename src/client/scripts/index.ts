import { bindStartButton } from './quiz_view_controller';
import { bindViewerAccessKeyScreen } from './viewer_view_controller';

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.role === 'viewer') {
    bindViewerAccessKeyScreen();
    return;
  }
  bindStartButton();
});
