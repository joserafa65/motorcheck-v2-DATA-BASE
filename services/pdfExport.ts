
import { jsPDF } from 'jspdf';
import { VehicleSettings, FuelLog, ServiceLog, UnitSystem } from '../types';
import { CURRENCY_FORMATTER, DATE_FORMATTER } from '../constants';

export const PDFExportService = {
  generateHistoryPDF: async (
    vehicle: VehicleSettings,
    fuelLogs: FuelLog[],
    serviceLogs: ServiceLog[],
    includePhotos: boolean
  ) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 25;

    // --- COLORS ---
    const accentColor = [0, 102, 255];
    const darkText = [31, 41, 55];
    const mediumGray = [107, 114, 128];
    const lightGray = [229, 231, 235];
    const veryLightGray = [249, 250, 251];

    // Helper function to add footer on every page
    const addFooter = () => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text(
        'Documento generado por MotorCheck – www.labappstudio.com/motorcheck',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    };

    // --- 1. HEADER ---
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, 20, pageWidth - margin, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('MOTORCHECK', margin, 17);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text(`Generado: ${DATE_FORMATTER.format(new Date())}`, pageWidth - margin, 17, { align: 'right' });

    yPos = 30;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('Libro de Vida del Vehículo', margin, yPos);

    yPos += 5;
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(1);
    doc.line(margin, yPos, margin + 80, yPos);

    yPos += 15;

    if (vehicle.photoUrl) {
        try {
            doc.addImage(vehicle.photoUrl, 'JPEG', margin, yPos, contentWidth, 90, undefined, 'FAST');
            yPos += 100;
        } catch (e) {
            yPos += 10;
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(`${vehicle.brand} ${vehicle.model} ${vehicle.year}`, margin, yPos);

    yPos += 8;
    doc.setFontSize(12);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`Placa: ${vehicle.plate || 'SIN PLACA'}`, margin, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text(`Kilometraje actual: ${vehicle.currentOdometer.toLocaleString()} km`, margin, yPos);

    // --- 2. SUMMARY DASHBOARD ---
    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('Resumen General', margin, yPos);

    yPos += 3;
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 10;

    const totalFuelSpent = fuelLogs.reduce((acc, l) => acc + l.totalCost, 0);
    const totalServicesCount = serviceLogs.length;
    const totalRefuelsCount = fuelLogs.length;
    const avgCostPerRefuel = totalRefuelsCount > 0 ? totalFuelSpent / totalRefuelsCount : 0;
    let avgEff = "N/A";
    if (fuelLogs.length > 1) {
        const sorted = [...fuelLogs].sort((a,b) => a.odometer - b.odometer);
        const dist = sorted[sorted.length-1].odometer - sorted[0].odometer;
        const vol = sorted.slice(1).reduce((acc, l) => acc + l.volume, 0);
        if (vol > 0) avgEff = (dist / vol).toFixed(1);
    }
    const unit = vehicle.unitSystem === UnitSystem.KM_GAL ? 'km/gal' : 'km/l';

    const cardWidth = (contentWidth - 8) / 2;
    const cardHeight = 24;

    const drawSummaryCard = (x: number, y: number, label: string, value: string) => {
        doc.setFillColor(veryLightGray[0], veryLightGray[1], veryLightGray[2]);
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        doc.text(label.toUpperCase(), x + 5, y + 8);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(value, x + 5, y + 18);
    };

    drawSummaryCard(margin, yPos, 'Tanqueadas', `${totalRefuelsCount}`);
    drawSummaryCard(margin + cardWidth + 8, yPos, 'Servicios', `${totalServicesCount}`);

    yPos += cardHeight + 6;

    drawSummaryCard(margin, yPos, 'Costo Promedio/Tanqueada', CURRENCY_FORMATTER.format(avgCostPerRefuel));
    drawSummaryCard(margin + cardWidth + 8, yPos, 'Consumo Promedio', `${avgEff} ${unit}`);

    addFooter();

    // --- 3. SERVICES HISTORY ---
    doc.addPage();
    yPos = 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('Historial de Mantenimientos', margin, yPos);

    yPos += 3;
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;

    const sortedServices = [...serviceLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedServices.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        doc.text('No hay registros de servicios realizados.', margin, yPos);
    }

    sortedServices.forEach((log) => {
        if (yPos > 240) {
            addFooter();
            doc.addPage();
            yPos = 30;
        }

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, contentWidth, 35, 1, 1, 'FD');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        doc.text(DATE_FORMATTER.format(new Date(log.date)), margin + 5, yPos + 7);
        doc.text(`${log.odometer.toLocaleString()} km`, pageWidth - margin - 5, yPos + 7, { align: 'right' });

        yPos += 13;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(log.serviceName, margin + 5, yPos);

        if (log.notes) {
            yPos += 5;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
            const splitNotes = doc.splitTextToSize(log.notes, contentWidth - 10);
            doc.text(splitNotes, margin + 5, yPos);
            yPos += (splitNotes.length * 3.5);
        } else {
            yPos += 3;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(`${CURRENCY_FORMATTER.format(log.cost)}`, margin + 5, yPos + 5);

        yPos += 15;

        if (includePhotos && log.receiptPhoto) {
            if (yPos > 190) {
                addFooter();
                doc.addPage();
                yPos = 30;
            }
            try {
                doc.addImage(log.receiptPhoto, 'JPEG', margin + 10, yPos, contentWidth - 20, 60, undefined, 'FAST');
                yPos += 70;
            } catch(err) {}
        }
    });

    addFooter();

    // --- 4. FUEL HISTORY ---
    doc.addPage();
    yPos = 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('Historial de Combustible', margin, yPos);

    yPos += 3;
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;

    const sortedFuel = [...fuelLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const volLabel = vehicle.unitSystem === UnitSystem.KM_GAL ? 'gal' : 'L';

    if (sortedFuel.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        doc.text('No hay registros de combustible.', margin, yPos);
    } else {
        doc.setFillColor(veryLightGray[0], veryLightGray[1], veryLightGray[2]);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text('FECHA', margin + 5, yPos + 5.5);
        doc.text('ODÓMETRO', margin + 45, yPos + 5.5);
        doc.text(`CANTIDAD (${volLabel})`, margin + 85, yPos + 5.5);
        doc.text('TOTAL', pageWidth - margin - 5, yPos + 5.5, { align: 'right' });

        yPos += 8;

        sortedFuel.forEach((log) => {
            if (yPos > 270) {
                addFooter();
                doc.addPage();
                yPos = 30;

                doc.setFillColor(veryLightGray[0], veryLightGray[1], veryLightGray[2]);
                doc.rect(margin, yPos, contentWidth, 8, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(darkText[0], darkText[1], darkText[2]);
                doc.text('FECHA', margin + 5, yPos + 5.5);
                doc.text('ODÓMETRO', margin + 45, yPos + 5.5);
                doc.text(`CANTIDAD (${volLabel})`, margin + 85, yPos + 5.5);
                doc.text('TOTAL', pageWidth - margin - 5, yPos + 5.5, { align: 'right' });
                yPos += 8;
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(darkText[0], darkText[1], darkText[2]);
            doc.text(DATE_FORMATTER.format(new Date(log.date)), margin + 5, yPos + 5);
            doc.text(`${log.odometer.toLocaleString()} km`, margin + 45, yPos + 5);
            doc.text(`${log.volume}`, margin + 85, yPos + 5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.text(CURRENCY_FORMATTER.format(log.totalCost), pageWidth - margin - 5, yPos + 5, { align: 'right' });

            doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
            doc.setLineWidth(0.3);
            doc.line(margin, yPos + 8, pageWidth - margin, yPos + 8);
            yPos += 9;
        });
    }

    addFooter();

    const filename = `MotorCheck_Historial_${vehicle.brand}_${vehicle.model}_${vehicle.plate}.pdf`.replace(/\s+/g, '_');
    doc.save(filename);
  }
};
