import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PURCHASE_ORDER_STATUS_LABELS } from '@/constants';

interface PurchaseOrder {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    delivery_date: string;
    created_at: string;
    payment_method?: string;
    internal_notes?: string;
    suppliers: {
        name: string;
        contact_name: string;
        email: string;
        phone: string;
        address: string;
        tax_id: string;
    };
    purchase_requests: {
        request_number: string;
        justification: string;
        items: any[]; // items logic needs check, might need separate fetch
        users: {
            full_name: string;
            department: string;
        };
    };
    approvals?: any[];
}

export const generatePurchaseOrderPDF = (order: PurchaseOrder, approvals: any[] = []) => {
    const doc = new jsPDF();

    // -- CONFIG --
    const margin = 20;
    let y = margin;

    // -- HEADER --
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Blue
    doc.text('ORDEN DE COMPRA', margin, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`No. ${order.order_number}`, 150, y);
    y += 6;
    doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`, 150, y);
    y += 6;
    doc.text(`Estado: ${PURCHASE_ORDER_STATUS_LABELS[order.status as keyof typeof PURCHASE_ORDER_STATUS_LABELS] || order.status}`, 150, y);

    y += 15;

    // -- SUPPLIER INFO --
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('PROVEEDOR:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(order.suppliers?.name || 'N/A', margin, y);
    y += 5;
    doc.text(`Contacto: ${order.suppliers?.contact_name || '-'}`, margin, y);
    y += 5;
    doc.text(`NIT: ${order.suppliers?.tax_id || '-'}`, margin, y);
    y += 5;
    doc.text(`Tel: ${order.suppliers?.phone || '-'}`, margin, y);

    // -- DELIVERY INFO (Right Side) --
    let yRight = margin + 25;
    doc.setFont('helvetica', 'bold');
    doc.text('ENTREGAR EN:', 120, yRight);
    yRight += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Colegio Manos a la Obra', 120, yRight);
    yRight += 5;
    doc.text('Departamento de Compras', 120, yRight);
    yRight += 5;
    doc.text(`Fecha Entrega: ${new Date(order.delivery_date).toLocaleDateString()}`, 120, yRight);
    yRight += 5;
    doc.text(`Pago: ${order.payment_method?.toUpperCase() || 'CRÉDITO'}`, 120, yRight);

    y = Math.max(y, yRight) + 15;

    // -- DETAILS --
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE REQUERIMIENTOS', margin, y);
    y += 8;

    const tableColumn = ["Descripción / Justificación", "Departamento", "Monto Estimado"];
    const tableRows = [
        [
            order.purchase_requests?.justification || 'Sin descripción',
            order.purchase_requests?.users?.department || 'General',
            `Q ${order.total_amount?.toLocaleString() || '0.00'}`
        ]
    ];

    autoTable(doc, {
        startY: y,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10;

    // -- TOTALS --
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL FINAL: Q ${order.total_amount?.toLocaleString()}`, 140, y);

    y += 20;

    // -- SIGNATURES --
    doc.setFontSize(10);
    doc.text('AUTORIZACIONES', margin, y);
    y += 5;

    // Draw boxes for signatures
    // Box 1: Jefe Compras (Creator)
    // Box 2: Jefe Presupuesto
    // Box 3: Jefe Operaciones / Calidad

    const boxWidth = 50;
    const boxHeight = 25;
    const gap = 10;
    let x = margin;

    // 1. Solicitado
    doc.rect(x, y, boxWidth, boxHeight);
    doc.setFontSize(8);
    doc.text('SOLICITADO POR', x + 2, y + 4);
    doc.setFontSize(7);
    doc.text(order.purchase_requests?.users?.full_name || 'Usuairo', x + 2, y + boxHeight - 2);

    x += boxWidth + gap;

    // 2. Aprobaciones (Loop through approvals)
    if (approvals && approvals.length > 0) {
        approvals.forEach((app) => {
            if (app.status === 'approved') {
                doc.rect(x, y, boxWidth, boxHeight);
                doc.setFontSize(8);
                doc.text(`APROBADO: ${app.approver_role.replace('jefe_', '').toUpperCase()}`, x + 2, y + 4);
                doc.text(new Date(app.approved_at).toLocaleDateString(), x + 2, y + 8);
                // Mock Signature
                doc.setFont('courier', 'italic');
                doc.setFontSize(14);
                doc.text('Firmado Digitalmente', x + 5, y + 18);
                doc.setFont('helvetica', 'normal');
                x += boxWidth + gap;
            }
        });
    } else {
        // Empty boxes if pending
        doc.rect(x, y, boxWidth, boxHeight);
        doc.text('PENDIENTE AUTORIZACIÓN', x + 2, y + 15);
    }

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Generado por Sistema de Gestión - Colegio Manos a la Obra', margin, 290);
        doc.text(`Página ${i} de ${pageCount}`, 190, 290);
    }

    doc.save(`Orden_${order.order_number}.pdf`);
};

export const generateExpressOrderPDF = (order: any) => {
    const doc = new jsPDF();

    // -- CONFIG --
    const margin = 20;
    let y = margin;

    // -- HEADER --
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Blue
    doc.text('ORDEN DE COMPRA EXPRESS', margin, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`No. ${order.order_number}`, 150, y);
    y += 6;
    doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`, 150, y);
    y += 6;

    // Status Label
    const statusLabel = order.status === 'pending_approval' ? 'EN REVISIÓN' :
        order.status === 'approved' ? 'APROBADA' :
            order.status === 'completed' ? 'COMPLETADA' :
                order.status.toUpperCase();

    doc.text(`Estado: ${statusLabel}`, 150, y);

    y += 15;

    // -- GENERAL INFO --
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN GENERAL', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Left col
    const creatorName = order.creator?.full_name || 'N/A';
    doc.text(`Solicitante: ${creatorName}`, margin, y);
    y += 6;
    doc.text(`Departamento: ${order.department || 'N/A'}`, margin, y);
    y += 6;
    doc.text(`Método de Pago: ${order.payment_method?.toUpperCase() || ''} ${order.cheque_number ? `(#${order.cheque_number})` : ''}`, margin, y);
    y += 10;

    // Justification Box
    doc.setFont('helvetica', 'italic');
    const splitJustification = doc.splitTextToSize(`"Justificación: ${order.justification}"`, 170);
    doc.text(splitJustification, margin, y);
    y += (splitJustification.length * 5) + 10;

    // -- ITEMS GROUPED BY SUPPLIER --
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('DETALLE DE ARTÍCULOS POR PROVEEDOR', margin, y);
    y += 8;

    // Group items
    const itemsBySupplier: Record<string, any[]> = {};
    if (order.items) {
        order.items.forEach((item: any) => {
            const sup = item.supplier_name || 'Otros';
            if (!itemsBySupplier[sup]) itemsBySupplier[sup] = [];
            itemsBySupplier[sup].push(item);
        });
    }

    Object.entries(itemsBySupplier).forEach(([supplier, items]) => {
        // Supplier Header
        if (y > 270) { doc.addPage(); y = margin; }

        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text(supplier.toUpperCase(), margin, y);
        y += 6;

        const tableColumn = ["Cant", "Unidad", "Descripción", "Precio Est.", "Subtotal"];
        const tableRows = items.map(item => [
            item.quantity,
            item.unit,
            item.description,
            `Q ${item.estimated_unit_price.toLocaleString()}`,
            `Q ${(item.quantity * item.estimated_unit_price).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: y,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 50 },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                1: { halign: 'center', cellWidth: 20 },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // @ts-ignore
        y = doc.lastAutoTable.finalY + 10;
    });

    if (y > 270) { doc.addPage(); y = margin; }

    // -- TOTALS --
    let total = 0;
    if (order.items) {
        total = order.items.reduce((sum: number, i: any) => sum + (i.quantity * i.estimated_unit_price), 0);
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL ESTIMADO: Q ${total.toLocaleString()}`, 140, y);

    if (order.real_total) {
        y += 6;
        doc.setTextColor(41, 128, 185);
        doc.text(`TOTAL REAL: Q ${order.real_total.toLocaleString()}`, 140, y);
    }

    y += 25;
    if (y > 260) { doc.addPage(); y = margin + 20; }

    // -- SIGNATURES --
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('AUTORIZACIONES', margin, y);
    y += 5;

    const roles = [
        { id: 'jefe_presupuesto', label: 'PRESUPUESTO' },
        { id: 'jefe_operaciones', label: 'OPERACIONES' },
        { id: 'jefe_calidad', label: 'CALIDAD' }
    ];

    const boxWidth = 45;
    const boxHeight = 25;
    const gap = 10;
    let x = margin;

    roles.forEach(role => {
        const approval = order.approvals?.find((a: any) => a.approver_role === role.id && a.status === 'approved');

        doc.setDrawColor(200);
        doc.rect(x, y, boxWidth, boxHeight);

        doc.setFontSize(7);
        doc.text(role.label, x + 2, y + 4);

        if (approval) {
            doc.setFontSize(8);
            doc.setTextColor(0, 100, 0); // Green
            doc.text('AUTORIZADO', x + 5, y + 15);
            doc.setFontSize(6);
            doc.setTextColor(100);
            doc.text(new Date(approval.approved_at).toLocaleDateString(), x + 5, y + 22);
        } else {
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('PENDIENTE', x + 10, y + 15);
        }

        doc.setTextColor(0);
        x += boxWidth + gap;
    });

    doc.save(`Orden_Express_${order.order_number}.pdf`);
};

export const generateRequisitionDeliveryPDF = async (
    requisition: any,
    dispatch: any,
    items: any[]
) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('CONSTANCIA DE ENTREGA', margin, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Requisición No. ${requisition.requisition_number}`, 140, y);
    y += 6;
    doc.text(`Fecha Entrega: ${new Date(dispatch.created_at).toLocaleString()}`, 140, y);
    y += 15;

    // Delivery Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE LA ENTREGA', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Recibido por: ${dispatch.received_by_name}`, margin, y);
    y += 6;
    doc.text(`Entregado por: ${dispatch.dispatched_by_user?.full_name || 'Bodega'}`, margin, y);
    y += 6;
    if (dispatch.notes) {
        doc.text(`Notas: ${dispatch.notes}`, margin, y);
        y += 10;
    } else {
        y += 4;
    }

    // Items Table
    const tableColumn = ["Artículo", "U.M.", "Entregado"];
    const tableRows = items.map(item => [
        item.requisition_items?.item_name || item.item_name || 'Artículo',
        item.requisition_items?.unit_of_measure || item.unit_of_measure || 'uds',
        item.quantity_delivered.toString()
    ]);

    autoTable(doc, {
        startY: y,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9 },
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 20;

    // Signature
    if (dispatch.signature_url) {
        try {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('FIRMA DE CONFORMIDAD:', margin, y);
            y += 5;

            // Load and add signature image
            // We use a promise to ensure image is loaded before adding to PDF
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    try {
                        const imgWidth = 60;
                        const imgHeight = 25;
                        doc.addImage(img, 'PNG', margin, y, imgWidth, imgHeight);
                        resolve(null);
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = (err) => reject(err);
                img.src = dispatch.signature_url;
            });

            y += 30;
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Firma Registrada Digitalmente', margin, y);
            doc.setDrawColor(200);
            doc.line(margin, y + 2, margin + 60, y + 2);
        } catch (e) {
            console.warn('PDF Signature error:', e);
            // Fallback to text if image fails
            doc.text('Firma Registrada Digitalmente (Imagen no disponible)', margin, y + 10);
        }
    }

    doc.save(`Entrega_${requisition.requisition_number}_${Date.now()}.pdf`);
};

export const generateWarehouseExitPDF = async (
    receiverName: string,
    department: string,
    items: any[],
    signatureImg: string,
    deliveryDate: string = new Date().toLocaleDateString()
) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header - Title
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Professional Blue
    doc.setFont('helvetica', 'bold');
    doc.text('VALE DE SALIDA DE ALMACÉN', margin, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${deliveryDate}`, 150, y);
    y += 15;

    // Institution Info
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Colegio Manos a la Obra', margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Departamento de Administración / Bodega', margin, y);
    y += 15;

    // Delivery Details
    doc.setDrawColor(220);
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, 170, 25, 'F');

    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ENTREGADO A:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(receiverName, margin + 40, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DEPARTAMENTO:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(department, margin + 40, y);

    y += 15;

    // Items Table
    const tableColumn = ["Cant.", "Unidad", "Descripción del Artículo"];
    const tableRows = items.map(item => {
        const qty = item.quantity || item.quantityToAdd || 0;
        const unit = item.unit || item.unit_of_measure || 'unidades';
        return [qty.toString(), unit, item.name || 'Artículo'];
    });

    autoTable(doc, {
        startY: y,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 30, halign: 'center' },
        }
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 20;

    // Signature Section
    if (y > 240) { // Check for page overflow
        doc.addPage();
        y = margin + 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA DE RECIBIDO Y CONFORMIDAD:', margin, y);
    y += 5;

    if (signatureImg) {
        try {
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const imgWidth = 60;
                    const imgHeight = 25;
                    doc.addImage(img, 'PNG', margin, y, imgWidth, imgHeight);
                    resolve(null);
                };
                img.onerror = (err) => reject(err);
                if (signatureImg.startsWith('http')) {
                    img.src = signatureImg;
                } else {
                    img.src = signatureImg; // dataURL
                }
            });
            y += 30;
        } catch (e) {
            console.warn('PDF Signature error (Warehouse Exit):', e);
            y += 15;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('(Firma Registrada Digitalmente)', margin, y);
            y += 5;
        }
    } else {
        y += 20;
    }

    doc.setDrawColor(150);
    doc.line(margin, y, margin + 70, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(receiverName, margin, y);
    y += 4;
    doc.text('Recibe Conforme', margin, y);

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Comprobante de Salida de Inventario - Colegio Manos a la Obra', margin, 285);
        doc.text(`Página ${i} de ${pageCount}`, 180, 285);
    }

    doc.save(`Vale_Salida_${receiverName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

export const generateExpressOrderDeliveryPDF = async (order: any) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header - Title
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Professional Blue
    doc.setFont('helvetica', 'bold');
    doc.text('CONSTANCIA DE ENTREGA - ÓRDEN EXPRESS', margin, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date(order.delivered_at || Date.now()).toLocaleDateString()}`, 150, y);
    y += 15;

    // Institution Info
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Colegio Manos a la Obra', margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Compras Express', margin, y);
    y += 15;

    // Order Info
    doc.setDrawColor(220);
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, 170, 30, 'F');

    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEN NO:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.order_number, margin + 40, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('ENTREGADO A:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.delivered_to_name || 'N/A', margin + 40, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DEPARTAMENTO:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.department || 'N/A', margin + 40, y);

    y += 15;

    // Items Table
    const tableColumn = ["Cant.", "Unidad", "Descripción del Artículo", "Precio Real", "Subtotal Real"];
    const tableRows = (order.items || []).map((item: any) => {
        return [
            item.quantity.toString(),
            item.unit,
            item.description,
            `Q ${item.real_unit_price?.toLocaleString() || '0.00'}`,
            `Q ${item.real_subtotal?.toLocaleString() || '0.00'}`
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10;

    // Real Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`TOTAL FINAL REAL: Q ${order.real_total?.toLocaleString() || '0.00'}`, 130, y);
    y += 15;

    // Signature Section
    if (y > 230) {
        doc.addPage();
        y = margin + 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA DE RECIBIDO Y CONFORMIDAD:', margin, y);
    y += 5;

    if (order.delivered_signature_url) {
        try {
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const imgWidth = 60;
                    const imgHeight = 25;
                    doc.addImage(img, 'PNG', margin, y, imgWidth, imgHeight);
                    resolve(null);
                };
                img.onerror = (err) => reject(err);
                img.src = order.delivered_signature_url;
            });
            y += 30;
        } catch (e) {
            console.warn('PDF Signature error (Express Delivery):', e);
            y += 15;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('(Firma Registrada Digitalmente)', margin, y);
            y += 5;
        }
    } else {
        y += 20;
    }

    doc.setDrawColor(150);
    doc.line(margin, y, margin + 70, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(order.delivered_to_name || 'Consumidor Final', margin, y);
    y += 4;
    doc.text('Recibe Conforme', margin, y);

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Constancia de Entrega - Órden Express - Colegio Manos a la Obra', margin, 285);
        doc.text(`Página ${i} de ${pageCount}`, 175, 285);
    }

    doc.save(`Entrega_Express_${order.order_number}.pdf`);
};
