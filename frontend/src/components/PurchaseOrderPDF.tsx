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
  poInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  poLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
  poNumberValue: {
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
    width: '60%',
  },
  colQuantity: {
    width: '40%',
    textAlign: 'right',
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

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  item: {
    name: string;
    barcode: string;
    unitOfMeasurement: string;
  };
}

interface PurchaseOrderData {
  poNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: string;
  project?: {
    name: string;
    projectCode: string;
  };
  items: PurchaseOrderItem[];
  notes?: string;
}

interface PurchaseOrderPDFProps {
  purchaseOrder: PurchaseOrderData;
}

export const PurchaseOrderPDFDocument: React.FC<PurchaseOrderPDFProps> = ({ purchaseOrder }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PURCHASE ORDER</Text>
          <View style={styles.poInfo}>
            <View>
              <Text style={styles.poLabel}>PO Number</Text>
              <Text style={styles.poNumberValue}>{purchaseOrder.poNumber}</Text>
            </View>
            <View>
              <Text style={styles.statusBadge}>
                {purchaseOrder.status?.toUpperCase() || 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        {/* Project & Date Information */}
        <View style={styles.projectInfo}>
          <View style={{ width: '50%' }}>
            <Text style={styles.sectionTitle}>Project</Text>
            {purchaseOrder.project ? (
              <>
                <Text style={styles.projectName}>{purchaseOrder.project.name}</Text>
                <Text style={styles.projectCode}>{purchaseOrder.project.projectCode}</Text>
              </>
            ) : (
              <Text style={styles.projectCode}>No project assigned</Text>
            )}
          </View>
          <View style={[{ width: '50%' }, styles.dateInfo]}>
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.dateLabel}>Order Date</Text>
              <Text style={styles.dateValue}>{formatDate(purchaseOrder.orderDate)}</Text>
            </View>
            {purchaseOrder.expectedDeliveryDate && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.dateLabel}>Expected Delivery</Text>
                <Text style={styles.dateValue}>{formatDate(purchaseOrder.expectedDeliveryDate)}</Text>
              </View>
            )}
            {purchaseOrder.actualDeliveryDate && (
              <View>
                <Text style={styles.dateLabel}>Actual Delivery</Text>
                <Text style={styles.dateValue}>{formatDate(purchaseOrder.actualDeliveryDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colQuantity]}>Quantity</Text>
          </View>
          {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
            purchaseOrder.items.map((item, index) => (
              <View key={item.id || index} style={styles.tableRow}>
                <View style={styles.colItem}>
                  <Text style={[styles.tableCell, styles.itemName]}>{item.item?.name || 'Unknown Item'}</Text>
                  <Text style={[styles.tableCell, styles.itemBarcode]}>{item.item?.barcode || ''}</Text>
                </View>
                <Text style={[styles.tableCell, styles.colQuantity]}>
                  {item.quantity} {item.item?.unitOfMeasurement || ''}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>No items found</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {purchaseOrder.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesContent}>{purchaseOrder.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Purchase Order Document</Text>
          <Text style={{ marginTop: 5 }}>
            Generated on {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
