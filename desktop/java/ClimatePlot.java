import gov.nasa.giss.panoply.cl.*;
import gov.nasa.giss.data.nc.NcVariable;
import ucar.nc2.Group;
import ucar.nc2.Variable;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Small adapter for the locally installed Panoply 5 command-line classes. */
public class ClimatePlot {
  static String quote(String value) {
    if (value == null) return "null";
    StringBuilder out = new StringBuilder("\"");
    for (char ch : value.toCharArray()) {
      if (ch == '"' || ch == '\\') out.append('\\').append(ch);
      else if (ch < 32) out.append(String.format("\\u%04x", (int) ch));
      else out.append(ch);
    }
    return out.append('"').toString();
  }
  static void collect(Group group, List<Variable> variables) {
    variables.addAll(group.getVariables());
    for (Group child : group.getGroups()) collect(child, variables);
  }
  public static void main(String[] args) {
    PCLDataset dataset = null;
    try {
      PCLFactory factory = PCLFactory.getSharedInstance();
      factory.setLogLevel("WARNING");
      dataset = factory.openDataset(args[1]);
      if (dataset == null) throw new IllegalArgumentException("Panoply konnte die Datei nicht öffnen.");
      if (args[0].equals("inspect")) {
        List<Variable> variables = new ArrayList<>();
        collect(dataset.getNcDataset().getNjFile().getRootGroup(), variables);
        List<String> result = new ArrayList<>();
        for (Variable variable : variables) {
          PCLVariable selected = dataset.getVariable(variable.getFullName());
          if (selected == null) continue;
          NcVariable nc = selected.getNcVariable();
          if (!nc.isGriddable2DGeo()) continue;
          List<String> dimensions = new ArrayList<>();
          for (int i = 1; i <= selected.getRank(); i++) {
            PCLDimension dimension = selected.getDimension(i);
            dimensions.add("{\"name\":" + quote(dimension.getName()) + ",\"length\":" + dimension.getLength() + ",\"first\":" + quote(dimension.getStrValue(1)) + "}");
          }
          result.add("{\"name\":" + quote(variable.getFullName()) + ",\"label\":" + quote(selected.getLongName()) + ",\"units\":" + quote(selected.getUnitsStr()) + ",\"dimensions\":[" + String.join(",", dimensions) + "]}");
        }
        Files.writeString(Paths.get(args[2]), "{\"variables\":[" + String.join(",", result) + "]}", StandardCharsets.UTF_8);
      } else if (args[0].equals("plot")) {
        PCLVariable variable = dataset.getVariable(args[2]);
        if (variable == null || !variable.getNcVariable().isGriddable2DGeo()) throw new IllegalArgumentException("Diese Variable unterstützt keinen geografischen 2D-Plot.");
        PCLPlot plot = factory.createPlot("lonlat", variable);
        if (plot == null) throw new IllegalStateException("Panoply konnte den Plot nicht erstellen.");
        try {
          // A new PCLPlot uses the first slice for independent dimensions.
          plot.set("size-factor", 150);
          if (!plot.saveImage("PNG", args[3])) throw new IllegalStateException("Panoply konnte das PNG nicht speichern.");
        } finally { plot.close(); }
      } else throw new IllegalArgumentException("Unbekannter Auftrag.");
      dataset.close();
      System.exit(0);
    } catch (Throwable error) {
      error.printStackTrace(System.err);
      if (dataset != null) try { dataset.close(); } catch (Throwable ignored) {}
      System.exit(1);
    }
  }
}
