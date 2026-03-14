/**
 * Action generation strategies for exploratory testing
 * Includes random, grammar-based, boundary, chaos, and adversarial testing
 */

import { Page } from 'playwright';

export type ActionType =
  | 'click'
  | 'type'
  | 'navigate'
  | 'scroll'
  | 'hover'
  | 'rightClick'
  | 'doubleClick'
  | 'pressKey'
  | 'fillForm'
  | 'uploadFile'
  | 'resize'
  | 'chaos';

export interface Action {
  type: ActionType;
  selector?: string;
  text?: string;
  key?: string;
  payload?: any;
  delay?: number;
  description: string;
}

export class ActionGenerator {
  private exploredSelectors = new Set<string>();
  private clickedElements = new Set<string>();
  private typedInFields = new Set<string>();

  constructor(private page: Page) {}

  /**
   * Select next action based on state and exploration strategy
   */
  async selectNextAction(
    exploredStates: Map<string, number>,
    currentSelectors: string[],
    strategy: 'random' | 'grammar' | 'boundary' | 'chaos' = 'random'
  ): Promise<Action> {
    switch (strategy) {
      case 'grammar':
        return this.grammarBasedAction(currentSelectors);
      case 'boundary':
        return this.boundaryTestingAction(currentSelectors);
      case 'chaos':
        return this.chaosAction();
      default:
        return this.randomAction(currentSelectors);
    }
  }

  /**
   * Random exploration - monkey testing
   */
  private async randomAction(currentSelectors: string[]): Promise<Action> {
    const interactiveElements = currentSelectors.filter(
      sel => !this.exploredSelectors.has(sel)
    );

    if (interactiveElements.length === 0) {
      return this.genericScrollOrKey();
    }

    const selector = interactiveElements[Math.floor(Math.random() * interactiveElements.length)];
    this.exploredSelectors.add(selector);

    const actionType = Math.random();

    if (actionType < 0.4) {
      return {
        type: 'click',
        selector,
        description: `Click on ${selector}`,
      };
    } else if (actionType < 0.6) {
      return {
        type: 'type',
        selector,
        text: this.generateRandomText(),
        description: `Type in ${selector}`,
      };
    } else if (actionType < 0.8) {
      return {
        type: 'hover',
        selector,
        description: `Hover over ${selector}`,
      };
    } else {
      return {
        type: 'rightClick',
        selector,
        description: `Right-click on ${selector}`,
      };
    }
  }

  /**
   * Grammar-based testing - valid user flows
   */
  private async grammarBasedAction(currentSelectors: string[]): Promise<Action> {
    const flowStates: Record<string, ActionType[]> = {
      onboarding: ['click', 'type', 'click', 'navigate'],
      settings: ['click', 'type', 'click'],
      sync: ['click', 'navigate', 'click'],
      messaging: ['click', 'type', 'click'],
    };

    // Detect current flow based on visible elements
    const currentFlow = this.detectCurrentFlow(currentSelectors);
    const actions = flowStates[currentFlow] || ['click', 'hover', 'scroll'];

    const actionType = actions[Math.floor(Math.random() * actions.length)];

    const selector = this.findMostRelevantSelector(currentSelectors, currentFlow);
    if (!selector) {
      return this.genericScrollOrKey();
    }

    switch (actionType) {
      case 'type':
        return {
          type: 'type',
          selector,
          text: this.generateContextualText(currentFlow),
          description: `Type contextual text in ${currentFlow} flow`,
        };
      case 'navigate':
        return {
          type: 'navigate',
          text: this.generateNextFlowUrl(currentFlow),
          description: `Navigate in ${currentFlow} flow`,
        };
      default:
        return {
          type: 'click',
          selector,
          description: `Click in ${currentFlow} flow`,
        };
    }
  }

  /**
   * Boundary testing - extreme inputs and rapid actions
   */
  private async boundaryTestingAction(currentSelectors: string[]): Promise<Action> {
    const testType = Math.random();

    if (testType < 0.3) {
      // Extreme input testing
      const selector = this.findInputField(currentSelectors);
      if (selector) {
        return {
          type: 'type',
          selector,
          text: this.generateBoundaryInput(),
          description: 'Boundary test: extreme input',
        };
      }
    } else if (testType < 0.6) {
      // Rapid clicking
      const selector = currentSelectors[Math.floor(Math.random() * currentSelectors.length)];
      return {
        type: 'click',
        selector,
        delay: 10,
        description: 'Boundary test: rapid click',
      };
    } else if (testType < 0.8) {
      // Back/forward spam
      return {
        type: 'pressKey',
        key: Math.random() > 0.5 ? 'Alt+ArrowLeft' : 'Alt+ArrowRight',
        description: 'Boundary test: back/forward navigation',
      };
    } else {
      // Window resize
      return {
        type: 'resize',
        payload: {
          width: Math.random() > 0.5 ? 320 : 1920,
          height: Math.random() > 0.5 ? 480 : 1080,
        },
        description: 'Boundary test: extreme window size',
      };
    }
  }

  /**
   * Chaos engineering - adversarial scenarios
   */
  private async chaosAction(): Promise<Action> {
    const chaosType = Math.floor(Math.random() * 7);

    switch (chaosType) {
      case 0:
        return {
          type: 'chaos',
          payload: { type: 'kill-backend' },
          description: 'Chaos: kill backend process',
        };
      case 1:
        return {
          type: 'chaos',
          payload: { type: 'network-flap' },
          description: 'Chaos: rapid network disconnect/reconnect',
        };
      case 2:
        return {
          type: 'chaos',
          payload: { type: 'slow-network' },
          description: 'Chaos: enable slow network',
        };
      case 3:
        return {
          type: 'chaos',
          payload: { type: 'corrupt-db' },
          description: 'Chaos: corrupt database',
        };
      case 4:
        return {
          type: 'chaos',
          payload: { type: 'fill-disk' },
          description: 'Chaos: simulate disk full',
        };
      case 5:
        return {
          type: 'chaos',
          payload: { type: 'revoke-token' },
          description: 'Chaos: revoke OAuth token',
        };
      default:
        return {
          type: 'chaos',
          payload: { type: 'restart-app' },
          description: 'Chaos: restart application',
        };
    }
  }

  /**
   * Detect current flow from visible selectors
   */
  private detectCurrentFlow(selectors: string[]): string {
    const selectorStr = selectors.join(' ');

    if (selectorStr.includes('onboard') || selectorStr.includes('welcome')) {
      return 'onboarding';
    } else if (selectorStr.includes('settings') || selectorStr.includes('preferences')) {
      return 'settings';
    } else if (selectorStr.includes('sync') || selectorStr.includes('calendar')) {
      return 'sync';
    } else if (selectorStr.includes('message') || selectorStr.includes('chat')) {
      return 'messaging';
    }

    return 'general';
  }

  /**
   * Find most relevant selector for current flow
   */
  private findMostRelevantSelector(selectors: string[], flow: string): string | null {
    const flowKeywords: Record<string, string[]> = {
      onboarding: ['next', 'start', 'begin', 'continue'],
      settings: ['save', 'toggle', 'select', 'apply'],
      sync: ['sync', 'calendar', 'refresh'],
      messaging: ['send', 'reply', 'compose'],
    };

    const keywords = flowKeywords[flow] || [];

    for (const keyword of keywords) {
      const match = selectors.find(s => s.toLowerCase().includes(keyword));
      if (match) return match;
    }

    return selectors[Math.floor(Math.random() * selectors.length)] || null;
  }

  /**
   * Generate contextual text for current flow
   */
  private generateContextualText(flow: string): string {
    const contextualTexts: Record<string, string[]> = {
      onboarding: ['john@example.com', 'password123', 'John Doe'],
      settings: ['true', 'false', 'enabled'],
      sync: ['sync', 'refresh', 'update'],
      messaging: ['Hello', 'Test message', 'Reply'],
    };

    const texts = contextualTexts[flow] || ['test'];
    return texts[Math.floor(Math.random() * texts.length)];
  }

  /**
   * Generate next flow URL
   */
  private generateNextFlowUrl(flow: string): string {
    const flowUrls: Record<string, string> = {
      onboarding: '/onboarding/step2',
      settings: '/settings/account',
      sync: '/sync/status',
      messaging: '/messages',
    };

    return flowUrls[flow] || '/';
  }

  /**
   * Find input fields in selectors
   */
  private findInputField(selectors: string[]): string | null {
    return (
      selectors.find(s => s.includes('input') || s.includes('field') || s.includes('text')) ||
      null
    );
  }

  /**
   * Generic scroll or key press
   */
  private genericScrollOrKey(): Action {
    if (Math.random() > 0.5) {
      return {
        type: 'scroll',
        payload: {
          direction: Math.random() > 0.5 ? 'down' : 'up',
          amount: Math.floor(Math.random() * 300) + 50,
        },
        description: 'Scroll page',
      };
    } else {
      return {
        type: 'pressKey',
        key: Math.random() > 0.5 ? 'Tab' : 'Enter',
        description: 'Press key',
      };
    }
  }

  /**
   * Generate random text input
   */
  private generateRandomText(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < Math.floor(Math.random() * 20) + 1; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate boundary test input
   */
  private generateBoundaryInput(): string {
    const boundaryInputs = [
      '', // Empty
      ' ', // Space
      '\n\n\n', // Newlines
      '<script>alert("xss")</script>', // XSS attempt
      "'; DROP TABLE users; --", // SQL injection attempt
      'a'.repeat(10000), // Very long input
      '🔥🎉🚀😀', // Emojis
      '\0\0\0', // Null bytes
    ];

    return boundaryInputs[Math.floor(Math.random() * boundaryInputs.length)];
  }
}
