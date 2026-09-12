export const BOARD_SIZE = 8;

export function isBoardCoordinate(coordinate: number): boolean {
	return (
		Number.isInteger(coordinate) && coordinate >= 0 && coordinate < BOARD_SIZE
	);
}
