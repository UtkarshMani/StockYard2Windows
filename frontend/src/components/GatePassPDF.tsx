import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  billInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gatePassNumber: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
  gatePassNumberValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    color: '#1E40AF',
    padding: '5px 10px',
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  projectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottom: '2 solid #E5E7EB',
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  projectCode: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 5,
  },
  address: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 5,
  },
  dateInfo: {
    textAlign: 'right',
  },
  dateLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2 solid #374151',
    paddingBottom: 8,
    marginBottom: 10,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 10,
  },
  tableCell: {
    fontSize: 10,
  },
  itemName: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  itemBarcode: {
    fontSize: 9,
    color: '#6B7280',
  },
  colItem: {
    width: '40%',
  },
  colQuantity: {
    width: '20%',
    textAlign: 'center',
  },
  colUnitPrice: {
    width: '20%',
    textAlign: 'right',
  },
  colTotal: {
    width: '20%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: '50%',
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    color: '#374151',
  },
  totalLabel: {
    fontSize: 11,
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: '2 solid #374151',
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  notesSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: '1 solid #E5E7EB',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  notesContent: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #E5E7EB',
    textAlign: 'center',
    fontSize: 9,
    color: '#6B7280',
  },
});

interface GatePassItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  item: {
    name: string;
    barcode: string;
    unitOfMeasurement: string;
  };
}

interface GatePassData {
  gatePassNumber: string;
  gatePassDate: string;
  dueDate?: string;
  status: string;
  project?: {
    name: string;
    projectCode: string;
    siteAddress?: string;
  };
  items: GatePassItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
}

interface GatePassPDFProps {
  gatepass: GatePassData;
}

export const GatePassPDFDocument: React.FC<GatePassPDFProps> = ({ gatepass }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount).toFixed(2)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <View style={styles.billInfo}>
            <View>
              <Text style={styles.gatePassNumber}>Gate Pass Number</Text>
              <Text style={styles.gatePassNumberValue}>{gatepass.gatePassNumber}</Text>
            </View>
            <View>
              <Text style={styles.statusBadge}>
                {gatepass.status?.toUpperCase() || 'BILLED'}
              </Text>
            </View>
          </View>
        </View>

        {/* Project & Date Information */}
        <View style={styles.projectInfo}>
          <View style={{ width: '50%' }}>
            <Text style={styles.sectionTitle}>Billed To</Text>
            {gatepass.project ? (
              <>
                <Text style={styles.projectName}>{gatepass.project.name}</Text>
                <Text style={styles.projectCode}>{gatepass.project.projectCode}</Text>
                {gatepass.project.siteAddress && (
                  <Text style={styles.address}>{gatepass.project.siteAddress}</Text>
                )}
              </>
            ) : (
              <Text style={styles.projectCode}>No project assigned</Text>
            )}
          </View>
          <View style={[{ width: '50%' }, styles.dateInfo]}>
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.dateLabel}>Gate Pass Date</Text>
              <Text style={styles.dateValue}>{formatDate(gatepass.gatePassDate)}</Text>
            </View>
            {gatepass.dueDate && (
              <View>
                <Text style={styles.dateLabel}>Due Date</Text>
                <Text style={styles.dateValue}>{formatDate(gatepass.dueDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colQuantity]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {gatepass.items && gatepass.items.length > 0 ? (
            gatepass.items.map((item, index) => (
              <View key={item.id || index} style={styles.tableRow}>
                <View style={styles.colItem}>
                  <Text style={[styles.tableCell, styles.itemName]}>{item.item?.name || 'Unknown Item'}</Text>
                  <Text style={[styles.tableCell, styles.itemBarcode]}>{item.item?.barcode || ''}</Text>
                </View>
                <Text style={[styles.tableCell, styles.colQuantity]}>
                  {item.quantity} {item.item?.unitOfMeasurement || ''}
                </Text>
                <Text style={[styles.tableCell, styles.colUnitPrice]}>
                  {formatCurrency(item.unitPrice)}
                </Text>
                <Text style={[styles.tableCell, styles.colTotal]}>
                  {formatCurrency(item.totalPrice)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>No items found</Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(gatepass.subtotal)}</Text>
          </View>
          {gatepass.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(gatepass.taxAmount)}</Text>
            </View>
          )}
          {gatepass.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: '#DC2626' }]}>
                -{formatCurrency(gatepass.discountAmount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(gatepass.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {gatepass.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesContent}>{gatepass.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          <Text style={{ marginTop: 5 }}>
            Generated on {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
