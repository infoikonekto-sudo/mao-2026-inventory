/**
 * Helper: calcula las unidades reales consumidas del stock (Despacho Decimal).
 * 
 * @param qty Cantidad ingresada en la UI
 * @param dispenseUnit Unidad seleccionada para el despacho (ej. 'unidades', 'cajas')
 * @param inventoryUnit Unidad base del inventario (ej. 'unidades', 'cajas')
 * @param unitsPerPackage Cantidad de unidades individuales por empaque (ej. 12 unidades por caja)
 * @returns Cantidad proporcional a descontar de la unidad base del inventario
 */
export function getStockUnitsConsumed(
    qty: number,
    dispenseUnit: string,
    inventoryUnit: string,
    unitsPerPackage: number
): number {
    if (dispenseUnit === inventoryUnit) return qty

    // Caso: Despachando en empaque (cajas) pero el inventario está en unidades
    if (
        (dispenseUnit === 'cajas' || dispenseUnit === 'paquetes') &&
        (inventoryUnit === 'unidades' || inventoryUnit === 'Unidad')
    ) {
        return qty * unitsPerPackage
    }

    // Caso: Despachando en unidades pero el inventario está en empaque (cajas)
    if (
        (dispenseUnit === 'unidades' || dispenseUnit === 'Unid') &&
        (inventoryUnit === 'cajas' || inventoryUnit === 'paquetes' || inventoryUnit === 'docenas')
    ) {
        return qty / unitsPerPackage
    }

    return qty
}
