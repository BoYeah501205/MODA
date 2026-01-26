/**
 * Report Export Service
 * 
 * Generates PDF and Word documents from daily set reports.
 * Uses jsPDF for PDF generation and docx for Word documents.
 */

(function() {
    'use strict';

    // ========================================================================
    // PDF GENERATION
    // ========================================================================

    async function generatePDF(report, options = {}) {
        // Check if jsPDF is available
        if (!window.jspdf?.jsPDF) {
            throw new Error('jsPDF library not loaded. Please include jspdf.umd.min.js');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        let yPos = margin;

        // Helper functions
        const addPage = () => {
            doc.addPage();
            yPos = margin;
        };

        const checkPageBreak = (height) => {
            if (yPos + height > pageHeight - margin) {
                addPage();
                return true;
            }
            return false;
        };

        const drawLine = (y) => {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
        };

        // ====================================================================
        // HEADER
        // ====================================================================
        
        // Logo placeholder (if available)
        doc.setFillColor(0, 87, 184); // Autovol blue
        doc.rect(margin, yPos, 40, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('MODA', margin + 20, yPos + 8, { align: 'center' });

        // Report title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.text('Daily Set Report', margin + 50, yPos + 5);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 50, yPos + 10);

        yPos += 20;
        drawLine(yPos);
        yPos += 8;

        // ====================================================================
        // PROJECT INFO
        // ====================================================================

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(report.projects?.name || 'Unknown Project', margin, yPos);
        yPos += 6;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const reportDate = new Date(report.report_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(reportDate, margin, yPos);
        yPos += 5;

        if (report.projects?.location) {
            doc.setTextColor(100, 100, 100);
            doc.text(report.projects.location, margin, yPos);
            yPos += 5;
        }

        doc.setTextColor(100, 100, 100);
        doc.text(`Report by: ${report.created_by_name || 'Unknown'}`, margin, yPos);
        yPos += 10;

        // ====================================================================
        // WEATHER CONDITIONS
        // ====================================================================

        if (report.weather_conditions && Object.keys(report.weather_conditions).length > 0) {
            checkPageBreak(25);
            
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos, contentWidth, 20, 'F');
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Weather Conditions', margin + 3, yPos + 5);

            const weather = report.weather_conditions;
            doc.setFont('helvetica', 'normal');
            
            let weatherText = [];
            if (weather.temperature_high || weather.temperature_low) {
                weatherText.push(`Temp: ${weather.temperature_high || '--'}°/${weather.temperature_low || '--'}°F`);
            }
            if (weather.conditions) {
                weatherText.push(weather.conditions);
            }
            if (weather.wind_speed) {
                weatherText.push(`Wind: ${weather.wind_speed} mph ${weather.wind_direction || ''}`);
            }
            
            doc.text(weatherText.join('  |  '), margin + 3, yPos + 12);
            
            if (weather.notes) {
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(weather.notes, margin + 3, yPos + 17);
            }

            yPos += 25;
        }

        // ====================================================================
        // SUMMARY STATISTICS
        // ====================================================================

        checkPageBreak(35);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Summary', margin, yPos);
        yPos += 7;

        // Calculate stats
        const modules = report.report_modules || [];
        const issues = report.report_issues || [];
        const photos = report.report_photos || [];

        const stats = {
            modulesSet: modules.filter(m => m.set_status === 'set').length,
            modulesPartial: modules.filter(m => m.set_status === 'partial').length,
            modulesNotSet: modules.filter(m => m.set_status === 'not_set').length,
            criticalIssues: issues.filter(i => i.severity === 'critical').length,
            majorIssues: issues.filter(i => i.severity === 'major').length,
            minorIssues: issues.filter(i => i.severity === 'minor').length,
            totalPhotos: photos.length
        };

        // Draw stat boxes
        const boxWidth = (contentWidth - 15) / 4;
        const boxHeight = 18;
        const statBoxes = [
            { label: 'Modules Set', value: `${stats.modulesSet}/${modules.length}`, color: [22, 163, 74] },
            { label: 'Partial', value: stats.modulesPartial, color: [234, 88, 12] },
            { label: 'Issues', value: issues.length, color: issues.length > 0 ? [220, 38, 38] : [100, 100, 100] },
            { label: 'Photos', value: stats.totalPhotos, color: [59, 130, 246] }
        ];

        statBoxes.forEach((stat, idx) => {
            const x = margin + (idx * (boxWidth + 5));
            
            doc.setFillColor(245, 245, 245);
            doc.rect(x, yPos, boxWidth, boxHeight, 'F');
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...stat.color);
            doc.text(String(stat.value), x + boxWidth / 2, yPos + 10, { align: 'center' });
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(stat.label, x + boxWidth / 2, yPos + 15, { align: 'center' });
        });

        yPos += boxHeight + 10;

        // ====================================================================
        // MODULES LIST
        // ====================================================================

        if (modules.length > 0) {
            checkPageBreak(20);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Modules', margin, yPos);
            yPos += 7;

            // Table header
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos, contentWidth, 7, 'F');
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('#', margin + 2, yPos + 5);
            doc.text('Module', margin + 12, yPos + 5);
            doc.text('Serial Number', margin + 55, yPos + 5);
            doc.text('Status', margin + 110, yPos + 5);
            doc.text('Notes', margin + 140, yPos + 5);
            yPos += 8;

            // Table rows
            doc.setFont('helvetica', 'normal');
            modules.forEach((rm, idx) => {
                checkPageBreak(8);
                
                const module = rm.modules || {};
                const statusColors = {
                    set: [22, 163, 74],
                    partial: [234, 88, 12],
                    not_set: [100, 100, 100]
                };

                doc.setTextColor(0, 0, 0);
                doc.text(String(rm.set_sequence || idx + 1), margin + 2, yPos + 4);
                doc.text(module.blm_id || module.unit_type || 'N/A', margin + 12, yPos + 4);
                doc.text(module.serial_number || 'N/A', margin + 55, yPos + 4);
                
                doc.setTextColor(...(statusColors[rm.set_status] || [0, 0, 0]));
                doc.text(rm.set_status?.replace('_', ' ') || 'Unknown', margin + 110, yPos + 4);
                
                doc.setTextColor(100, 100, 100);
                const notes = rm.notes ? (rm.notes.length > 25 ? rm.notes.substring(0, 25) + '...' : rm.notes) : '';
                doc.text(notes, margin + 140, yPos + 4);

                yPos += 6;
                
                if (idx < modules.length - 1) {
                    doc.setDrawColor(230, 230, 230);
                    doc.line(margin, yPos, pageWidth - margin, yPos);
                    yPos += 1;
                }
            });

            yPos += 8;
        }

        // ====================================================================
        // ISSUES LIST
        // ====================================================================

        if (issues.length > 0) {
            checkPageBreak(20);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`Issues (${issues.length})`, margin, yPos);
            yPos += 8;

            const CATEGORIES = window.MODA_DAILY_REPORTS?.ISSUE_CATEGORIES || {};

            issues.forEach((issue, idx) => {
                checkPageBreak(30);

                const severityColors = {
                    critical: [220, 38, 38],
                    major: [234, 88, 12],
                    minor: [22, 163, 74]
                };

                // Issue header
                doc.setFillColor(250, 250, 250);
                doc.rect(margin, yPos, contentWidth, 6, 'F');
                
                // Severity badge
                doc.setFillColor(...(severityColors[issue.severity] || [100, 100, 100]));
                doc.roundedRect(margin + 2, yPos + 1, 18, 4, 1, 1, 'F');
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(issue.severity?.toUpperCase() || 'N/A', margin + 11, yPos + 4, { align: 'center' });

                // Category
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(9);
                const categoryLabel = CATEGORIES[issue.category]?.label || issue.category;
                doc.text(categoryLabel, margin + 25, yPos + 4);

                // Module (if linked)
                if (issue.modules) {
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Module: ${issue.modules.blm_id || issue.modules.serial_number}`, margin + 100, yPos + 4);
                }

                yPos += 8;

                // Description
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                const descLines = doc.splitTextToSize(issue.description || '', contentWidth - 10);
                descLines.forEach(line => {
                    checkPageBreak(5);
                    doc.text(line, margin + 5, yPos);
                    yPos += 4;
                });

                // Action taken
                if (issue.action_taken) {
                    yPos += 2;
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text('Action Taken:', margin + 5, yPos);
                    
                    doc.setFont('helvetica', 'normal');
                    const actionLines = doc.splitTextToSize(issue.action_taken, contentWidth - 30);
                    doc.text(actionLines[0], margin + 30, yPos);
                    yPos += 4;
                    
                    if (actionLines.length > 1) {
                        actionLines.slice(1).forEach(line => {
                            checkPageBreak(5);
                            doc.text(line, margin + 5, yPos);
                            yPos += 4;
                        });
                    }
                }

                // Photo links
                const issuePhotos = photos.filter(p => p.issue_id === issue.id);
                if (issuePhotos.length > 0) {
                    doc.setFontSize(8);
                    doc.setTextColor(59, 130, 246);
                    doc.text(`[${issuePhotos.length} photo(s) attached]`, margin + 5, yPos);
                    yPos += 4;
                }

                yPos += 5;

                if (idx < issues.length - 1) {
                    drawLine(yPos);
                    yPos += 5;
                }
            });

            yPos += 5;
        }

        // ====================================================================
        // PHOTOS SECTION
        // ====================================================================

        const generalPhotos = photos.filter(p => !p.module_id && !p.issue_id);
        if (generalPhotos.length > 0 && options.includePhotoLinks !== false) {
            checkPageBreak(20);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`General Photos (${generalPhotos.length})`, margin, yPos);
            yPos += 7;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            
            generalPhotos.forEach((photo, idx) => {
                checkPageBreak(6);
                
                const photoName = photo.file_name || `Photo ${idx + 1}`;
                if (photo.sharepoint_url) {
                    doc.setTextColor(59, 130, 246);
                    doc.textWithLink(photoName, margin + 5, yPos, { url: photo.sharepoint_url });
                } else {
                    doc.setTextColor(100, 100, 100);
                    doc.text(photoName, margin + 5, yPos);
                }
                
                if (photo.caption) {
                    doc.setTextColor(100, 100, 100);
                    doc.text(` - ${photo.caption}`, margin + 5 + doc.getTextWidth(photoName), yPos);
                }
                
                yPos += 5;
            });

            yPos += 5;
        }

        // ====================================================================
        // GENERAL NOTES
        // ====================================================================

        if (report.general_notes) {
            checkPageBreak(20);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Notes', margin, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            
            const noteLines = doc.splitTextToSize(report.general_notes, contentWidth - 10);
            noteLines.forEach(line => {
                checkPageBreak(5);
                doc.text(line, margin + 5, yPos);
                yPos += 5;
            });
        }

        // ====================================================================
        // FOOTER
        // ====================================================================

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Page ${i} of ${totalPages}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
            doc.text(
                'Generated by MODA - Autovol',
                pageWidth - margin,
                pageHeight - 10,
                { align: 'right' }
            );
        }

        // Return or save
        const fileName = `DailyReport_${report.projects?.name || 'Report'}_${report.report_date}.pdf`
            .replace(/[^a-zA-Z0-9_-]/g, '_');

        if (options.returnBlob) {
            return doc.output('blob');
        }

        doc.save(fileName);
        return fileName;
    }

    // ========================================================================
    // WORD DOCUMENT GENERATION
    // ========================================================================

    async function generateWord(report, options = {}) {
        // Check if docx library is available
        if (!window.docx) {
            throw new Error('docx library not loaded. Please include docx.min.js');
        }

        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
                WidthType, BorderStyle, AlignmentType, HeadingLevel } = window.docx;

        // Helper to create styled text
        const createText = (text, opts = {}) => new TextRun({
            text: text || '',
            bold: opts.bold,
            italics: opts.italic,
            color: opts.color,
            size: opts.size || 22, // 11pt default
            font: 'Calibri'
        });

        // Calculate stats
        const modules = report.report_modules || [];
        const issues = report.report_issues || [];
        const photos = report.report_photos || [];

        const stats = {
            modulesSet: modules.filter(m => m.set_status === 'set').length,
            modulesPartial: modules.filter(m => m.set_status === 'partial').length,
            modulesNotSet: modules.filter(m => m.set_status === 'not_set').length,
            totalIssues: issues.length,
            criticalIssues: issues.filter(i => i.severity === 'critical').length,
            majorIssues: issues.filter(i => i.severity === 'major').length,
            minorIssues: issues.filter(i => i.severity === 'minor').length
        };

        const CATEGORIES = window.MODA_DAILY_REPORTS?.ISSUE_CATEGORIES || {};

        // Build document sections
        const children = [];

        // Title
        children.push(new Paragraph({
            children: [createText('Daily Set Report', { bold: true, size: 36 })],
            heading: HeadingLevel.TITLE,
            spacing: { after: 200 }
        }));

        // Project name
        children.push(new Paragraph({
            children: [createText(report.projects?.name || 'Unknown Project', { bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 100 }
        }));

        // Date
        const reportDate = new Date(report.report_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        children.push(new Paragraph({
            children: [createText(reportDate)],
            spacing: { after: 100 }
        }));

        // Report by
        children.push(new Paragraph({
            children: [
                createText('Report by: ', { bold: true }),
                createText(report.created_by_name || 'Unknown')
            ],
            spacing: { after: 200 }
        }));

        // Weather
        if (report.weather_conditions && Object.keys(report.weather_conditions).length > 0) {
            const weather = report.weather_conditions;
            children.push(new Paragraph({
                children: [createText('Weather Conditions', { bold: true, size: 24 })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
            }));

            let weatherText = [];
            if (weather.temperature_high || weather.temperature_low) {
                weatherText.push(`Temperature: ${weather.temperature_high || '--'}°F / ${weather.temperature_low || '--'}°F`);
            }
            if (weather.conditions) weatherText.push(`Conditions: ${weather.conditions}`);
            if (weather.wind_speed) weatherText.push(`Wind: ${weather.wind_speed} mph ${weather.wind_direction || ''}`);
            if (weather.notes) weatherText.push(`Notes: ${weather.notes}`);

            weatherText.forEach(text => {
                children.push(new Paragraph({
                    children: [createText(text)],
                    spacing: { after: 50 }
                }));
            });
        }

        // Summary
        children.push(new Paragraph({
            children: [createText('Summary', { bold: true, size: 24 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
        }));

        children.push(new Paragraph({
            children: [
                createText(`Modules Set: ${stats.modulesSet}/${modules.length}`, { bold: true }),
                createText('  |  '),
                createText(`Partial: ${stats.modulesPartial}`),
                createText('  |  '),
                createText(`Issues: ${stats.totalIssues}`, { color: stats.totalIssues > 0 ? 'DC2626' : '000000' }),
                createText('  |  '),
                createText(`Photos: ${photos.length}`)
            ],
            spacing: { after: 200 }
        }));

        // Modules Table
        if (modules.length > 0) {
            children.push(new Paragraph({
                children: [createText('Modules', { bold: true, size: 24 })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
            }));

            const tableRows = [
                // Header row
                new TableRow({
                    children: ['#', 'Module', 'Serial Number', 'Status', 'Notes'].map(text =>
                        new TableCell({
                            children: [new Paragraph({ children: [createText(text, { bold: true })] })],
                            shading: { fill: 'E5E5E5' }
                        })
                    )
                }),
                // Data rows
                ...modules.map((rm, idx) => {
                    const module = rm.modules || {};
                    return new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [createText(String(rm.set_sequence || idx + 1))] })] }),
                            new TableCell({ children: [new Paragraph({ children: [createText(module.blm_id || module.unit_type || 'N/A')] })] }),
                            new TableCell({ children: [new Paragraph({ children: [createText(module.serial_number || 'N/A')] })] }),
                            new TableCell({ children: [new Paragraph({ children: [createText(rm.set_status?.replace('_', ' ') || 'Unknown')] })] }),
                            new TableCell({ children: [new Paragraph({ children: [createText(rm.notes || '')] })] })
                        ]
                    });
                })
            ];

            children.push(new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            }));
        }

        // Issues
        if (issues.length > 0) {
            children.push(new Paragraph({
                children: [createText(`Issues (${issues.length})`, { bold: true, size: 24 })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }));

            issues.forEach((issue, idx) => {
                const categoryLabel = CATEGORIES[issue.category]?.label || issue.category;
                const severityColors = { critical: 'DC2626', major: 'EA580C', minor: '16A34A' };

                children.push(new Paragraph({
                    children: [
                        createText(`[${issue.severity?.toUpperCase()}] `, { bold: true, color: severityColors[issue.severity] || '000000' }),
                        createText(categoryLabel, { bold: true }),
                        issue.modules ? createText(` - Module: ${issue.modules.blm_id || issue.modules.serial_number}`, { italic: true, color: '666666' }) : createText('')
                    ],
                    spacing: { before: 150, after: 50 }
                }));

                children.push(new Paragraph({
                    children: [createText(issue.description || '')],
                    spacing: { after: 50 }
                }));

                if (issue.action_taken) {
                    children.push(new Paragraph({
                        children: [
                            createText('Action Taken: ', { bold: true }),
                            createText(issue.action_taken)
                        ],
                        spacing: { after: 100 }
                    }));
                }
            });
        }

        // General Notes
        if (report.general_notes) {
            children.push(new Paragraph({
                children: [createText('Notes', { bold: true, size: 24 })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }));

            children.push(new Paragraph({
                children: [createText(report.general_notes)],
                spacing: { after: 100 }
            }));
        }

        // Photos section
        const generalPhotos = photos.filter(p => !p.module_id && !p.issue_id);
        if (generalPhotos.length > 0) {
            children.push(new Paragraph({
                children: [createText(`Photos (${generalPhotos.length})`, { bold: true, size: 24 })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }));

            generalPhotos.forEach((photo, idx) => {
                const photoName = photo.file_name || `Photo ${idx + 1}`;
                children.push(new Paragraph({
                    children: [
                        createText(`${idx + 1}. ${photoName}`),
                        photo.caption ? createText(` - ${photo.caption}`, { italic: true, color: '666666' }) : createText(''),
                        photo.sharepoint_url ? createText(` [Link]`, { color: '3B82F6' }) : createText('')
                    ],
                    spacing: { after: 50 }
                }));
            });
        }

        // Footer
        children.push(new Paragraph({
            children: [createText(`Generated by MODA - ${new Date().toLocaleString()}`, { size: 18, color: '999999' })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 }
        }));

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        // Generate and save
        const fileName = `DailyReport_${report.projects?.name || 'Report'}_${report.report_date}.docx`
            .replace(/[^a-zA-Z0-9_-]/g, '_');

        const blob = await Packer.toBlob(doc);

        if (options.returnBlob) {
            return blob;
        }

        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return fileName;
    }

    // ========================================================================
    // EXPORT MODULE
    // ========================================================================

    window.MODA_REPORT_EXPORT = {
        generatePDF,
        generateWord
    };

    if (window.MODA_DEBUG) console.log('MODA Report Export module loaded');

})();
