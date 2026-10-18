import { expect, type Page } from '@playwright/test';

/**
 * Waits until the page's `client:visible` search island has hydrated and
 * installed its listeners. Ctrl/Cmd+K only focuses the search box, so it is
 * safe to repeat inside `expect.poll`. Never retry a state-changing action
 * (opening a select, copying, toggling) in a poll: a slow runner can let the
 * first attempt succeed after the check, and the retry then undoes it or
 * blocks on the open popup.
 */
export async function waitForSearchIsland(page: Page, timeout?: number) {
	const search = page.getByRole('searchbox');
	await expect.poll(async () => {
		await page.keyboard.press('ControlOrMeta+k');
		return search.evaluate((element) => element === document.activeElement);
	}, { timeout }).toBe(true);
}

/**
 * Waits for a `?command=` deep link to settle. The island focuses the target
 * trigger and jumps the scroll position in an animation frame after
 * hydrating, so clicking earlier can land on whatever the jump moves into
 * place. Returns the command row.
 */
export async function waitForDeepLinkedCommand(page: Page, name: string) {
	const command = page.locator(`[data-command="${name}"]`);
	await expect(command.locator('[data-slot="accordion-trigger"]')).toBeFocused();
	return command;
}
