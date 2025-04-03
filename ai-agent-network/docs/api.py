# docs/api.py

from typing import Dict, Any, List, Optional, Union
import inspect
import json
import os
from docstring_parser import parse

class APIDocumentation:
    """Generator for API documentation based on agent and adapter code"""
    
    def __init__(self, output_dir: str = "docs/api"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_agent_docs(self, agents_module_path: str) -> Dict[str, Any]:
        """Generate documentation for all agents in the specified module"""
        import importlib
        import inspect
        import sys
        
        # Add the project root to sys.path if needed
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        # Import the module
        module_name = agents_module_path.replace("/", ".")
        if module_name.endswith(".py"):
            module_name = module_name[:-3]
        
        try:
            module = importlib.import_module(module_name)
        except ImportError as e:
            print(f"Error importing module {module_name}: {e}")
            return {}
        
        # Find all agent classes
        agent_classes = []
        for name, obj in inspect.getmembers(module):
            if inspect.isclass(obj) and (
                hasattr(obj, "run") or
                hasattr(obj, "execute")
            ):
                agent_classes.append(obj)
        
        # Generate documentation for each agent
        agent_docs = {}
        for agent_class in agent_classes:
            agent_docs[agent_class.__name__] = self._document_agent(agent_class)
        
        # Write to file
        self._write_json_doc("agents", agent_docs)
        
        return agent_docs
    
    def generate_adapter_docs(self, adapters_module_path: str) -> Dict[str, Any]:
        """Generate documentation for all database adapters"""
        import importlib
        import inspect
        import sys
        
        # Add the project root to sys.path if needed
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        # Import the module
        module_name = adapters_module_path.replace("/", ".")
        if module_name.endswith(".py"):
            module_name = module_name[:-3]
        
        try:
            module = importlib.import_module(module_name)
        except ImportError as e:
            print(f"Error importing module {module_name}: {e}")
            return {}
        
        # Find all adapter classes
        adapter_classes = []
        for name, obj in inspect.getmembers(module):
            if inspect.isclass(obj) and (
                hasattr(obj, "fetch_tables") or
                hasattr(obj, "run_query")
            ):
                adapter_classes.append(obj)
        
        # Generate documentation for each adapter
        adapter_docs = {}
        for adapter_class in adapter_classes:
            adapter_docs[adapter_class.__name__] = self._document_adapter(adapter_class)
        
        # Write to file
        self._write_json_doc("adapters", adapter_docs)
        
        return adapter_docs
    
    def generate_crew_docs(self, crew_module_path: str) -> Dict[str, Any]:
        """Generate documentation for the CrewAI integration"""
        import importlib
        import inspect
        import sys
        
        # Add the project root to sys.path if needed
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        # Import the module
        module_name = crew_module_path.replace("/", ".")
        if module_name.endswith(".py"):
            module_name = module_name[:-3]
        
        try:
            module = importlib.import_module(module_name)
        except ImportError as e:
            print(f"Error importing module {module_name}: {e}")
            return {}
        
        # Get the main function (run_crew_pipeline)
        run_crew_pipeline = getattr(module, "run_crew_pipeline", None)
        
        if not run_crew_pipeline:
            print(f"Could not find run_crew_pipeline in {module_name}")
            return {}
        
        # Document the pipeline function
        pipeline_doc = self._document_function(run_crew_pipeline)
        
        # Document other crew-related functions
        crew_functions = {}
        for name, obj in inspect.getmembers(module):
            if name != "run_crew_pipeline" and inspect.isfunction(obj):
                crew_functions[name] = self._document_function(obj)
        
        # Combine documentation
        crew_docs = {
            "run_crew_pipeline": pipeline_doc,
            "functions": crew_functions
        }
        
        # Write to file
        self._write_json_doc("crew", crew_docs)
        
        return crew_docs
    
    def generate_full_documentation(self) -> Dict[str, Any]:
        """Generate complete documentation for the entire AI agent network"""
        # Generate all documentation
        agent_docs = self.generate_agent_docs("agents")
        adapter_docs = self.generate_adapter_docs("db_adapters")
        crew_docs = self.generate_crew_docs("crew")
        
        # Combine into a single documentation object
        full_docs = {
            "agents": agent_docs,
            "adapters": adapter_docs,
            "crew": crew_docs,
            "version": "1.0.0",
            "generated_at": self._get_timestamp()
        }
        
        # Write to file
        self._write_json_doc("full_documentation", full_docs)
        
        # Generate HTML documentation
        self._generate_html_docs(full_docs)
        
        return full_docs
    
    def _document_agent(self, agent_class) -> Dict[str, Any]:
        """Generate documentation for a single agent class"""
        # Get class docstring
        class_doc = parse(agent_class.__doc__ or "")
        
        # Get methods
        methods = {}
        for name, method in inspect.getmembers(agent_class, predicate=inspect.isfunction):
            if not name.startswith("_") or name in ["__init__"]:
                methods[name] = self._document_function(method)
        
        # Create documentation object
        agent_doc = {
            "name": agent_class.__name__,
            "description": class_doc.short_description or "",
            "long_description": class_doc.long_description or "",
            "methods": methods,
            "path": inspect.getmodule(agent_class).__name__
        }
        
        return agent_doc
    
    def _document_adapter(self, adapter_class) -> Dict[str, Any]:
        """Generate documentation for a single adapter class"""
        # Get class docstring
        class_doc = parse(adapter_class.__doc__ or "")
        
        # Get methods
        methods = {}
        for name, method in inspect.getmembers(adapter_class, predicate=inspect.isfunction):
            if not name.startswith("_") or name in ["__init__", "_connect"]:
                methods[name] = self._document_function(method)
        
        # Create documentation object
        adapter_doc = {
            "name": adapter_class.__name__,
            "description": class_doc.short_description or "",
            "long_description": class_doc.long_description or "",
            "methods": methods,
            "path": inspect.getmodule(adapter_class).__name__
        }
        
        return adapter_doc
    
    def _document_function(self, func) -> Dict[str, Any]:
        """Generate documentation for a function or method"""
        # Get function docstring
        func_doc = parse(func.__doc__ or "")
        
        # Get parameters
        sig = inspect.signature(func)
        parameters = []
        
        for name, param in sig.parameters.items():
            # Skip self parameter
            if name == "self":
                continue
            
            # Try to get annotation
            param_type = "Any"
            if param.annotation != inspect.Parameter.empty:
                param_type = str(param.annotation)
                # Clean up annotations (remove typing. prefix, etc.)
                param_type = param_type.replace("typing.", "")
                
            # Try to get default value
            default_value = None
            if param.default != inspect.Parameter.empty:
                default_value = str(param.default)
            
            # Try to get description from docstring
            description = ""
            for param_doc in func_doc.params:
                if param_doc.arg_name == name:
                    description = param_doc.description or ""
                    break
            
            # Add parameter to list
            parameters.append({
                "name": name,
                "type": param_type,
                "description": description,
                "default": default_value,
                "required": param.default == inspect.Parameter.empty
            })
        
        # Get return type and description
        return_type = "Any"
        if sig.return_annotation != inspect.Signature.empty:
            return_type = str(sig.return_annotation)
            # Clean up annotations
            return_type = return_type.replace("typing.", "")
        
        return_description = ""
        if func_doc.returns:
            return_description = func_doc.returns.description or ""
        
        # Create function documentation
        func_doc_obj = {
            "name": func.__name__,
            "description": func_doc.short_description or "",
            "long_description": func_doc.long_description or "",
            "parameters": parameters,
            "returns": {
                "type": return_type,
                "description": return_description
            },
            "examples": [example.description for example in func_doc.examples],
            "source_file": inspect.getfile(func),
            "line_number": inspect.getsourcelines(func)[1]
        }
        
        return func_doc_obj
    
    def _write_json_doc(self, name: str, doc_data: Dict[str, Any]) -> None:
        """Write documentation to a JSON file"""
        filepath = os.path.join(self.output_dir, f"{name}.json")
        with open(filepath, "w") as f:
            json.dump(doc_data, f, indent=2)
        print(f"Documentation written to {filepath}")
    
    def _generate_html_docs(self, full_docs: Dict[str, Any]) -> None:
        """Generate HTML documentation from the JSON documentation"""
        # This is a simple HTML generator, could be replaced with a more sophisticated template
        html = self._generate_html_header("AI Agent Network Documentation")
        
        # Add table of contents
        html += "<div class='toc'>\n"
        html += "<h2>Table of Contents</h2>\n<ul>\n"
        html += "<li><a href='#agents'>Agents</a></li>\n"
        html += "<li><a href='#adapters'>Database Adapters</a></li>\n"
        html += "<li><a href='#crew'>CrewAI Integration</a></li>\n"
        html += "</ul>\n</div>\n"
        
        # Add agents section
        html += "<div class='section' id='agents'>\n"
        html += "<h2>Agents</h2>\n"
        for agent_name, agent_doc in full_docs["agents"].items():
            html += self._generate_agent_html(agent_name, agent_doc)
        html += "</div>\n"
        
        # Add adapters section
        html += "<div class='section' id='adapters'>\n"
        html += "<h2>Database Adapters</h2>\n"
        for adapter_name, adapter_doc in full_docs["adapters"].items():
            html += self._generate_adapter_html(adapter_name, adapter_doc)
        html += "</div>\n"
        
        # Add crew section
        html += "<div class='section' id='crew'>\n"
        html += "<h2>CrewAI Integration</h2>\n"
        html += self._generate_function_html("run_crew_pipeline", full_docs["crew"]["run_crew_pipeline"])
        html += "<h3>Crew Helper Functions</h3>\n"
        for func_name, func_doc in full_docs["crew"]["functions"].items():
            html += self._generate_function_html(func_name, func_doc)
        html += "</div>\n"
        
        # Close HTML
        html += "</body>\n</html>"
        
        # Write to file
        html_filepath = os.path.join(self.output_dir, "documentation.html")
        with open(html_filepath, "w") as f:
            f.write(html)
        print(f"HTML documentation written to {html_filepath}")
    
    def _generate_html_header(self, title: str) -> str:
        """Generate HTML header with styling"""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }}
        h1, h2, h3, h4 {{
            color: #1a73e8;
            margin-top: 20px;
        }}
        h1 {{
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }}
        .toc {{
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .section {{
            margin-bottom: 40px;
        }}
        .method, .parameter {{
            margin-left: 20px;
            padding: 10px;
            border-left: 3px solid #ddd;
            margin-bottom: 15px;
        }}
        .method:hover, .parameter:hover {{
            border-left-color: #1a73e8;
            background-color: #f9f9f9;
        }}
        .return {{
            margin-top: 10px;
            padding: 10px;
            background-color: #f0f8ff;
            border-radius: 5px;
        }}
        code {{
            background-color: #f5f5f5;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }}
        pre {{
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }}
        th {{
            background-color: #f2f2f2;
        }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <p>Generated at: {self._get_timestamp()}</p>
"""
    
    def _generate_agent_html(self, agent_name: str, agent_doc: Dict[str, Any]) -> str:
        """Generate HTML documentation for an agent"""
        html = f"<div class='agent' id='{agent_name}'>\n"
        html += f"<h3>{agent_name}</h3>\n"
        
        if agent_doc["description"]:
            html += f"<p>{agent_doc['description']}</p>\n"
        
        if agent_doc["long_description"]:
            html += f"<p>{agent_doc['long_description']}</p>\n"
        
        html += f"<p><strong>Module:</strong> <code>{agent_doc['path']}</code></p>\n"
        
        if agent_doc["methods"]:
            html += "<h4>Methods</h4>\n"
            for method_name, method_doc in agent_doc["methods"].items():
                html += self._generate_method_html(method_name, method_doc)
        
        html += "</div>\n"
        return html
    
    def _generate_adapter_html(self, adapter_name: str, adapter_doc: Dict[str, Any]) -> str:
        """Generate HTML documentation for a database adapter"""
        html = f"<div class='adapter' id='{adapter_name}'>\n"
        html += f"<h3>{adapter_name}</h3>\n"
        
        if adapter_doc["description"]:
            html += f"<p>{adapter_doc['description']}</p>\n"
        
        if adapter_doc["long_description"]:
            html += f"<p>{adapter_doc['long_description']}</p>\n"
        
        html += f"<p><strong>Module:</strong> <code>{adapter_doc['path']}</code></p>\n"
        
        if adapter_doc["methods"]:
            html += "<h4>Methods</h4>\n"
            for method_name, method_doc in adapter_doc["methods"].items():
                html += self._generate_method_html(method_name, method_doc)
        
        html += "</div>\n"
        return html
    
    def _generate_method_html(self, method_name: str, method_doc: Dict[str, Any]) -> str:
        """Generate HTML documentation for a method"""
        html = f"<div class='method' id='{method_name}'>\n"
        html += f"<h4>{method_name}</h4>\n"
        
        if method_doc["description"]:
            html += f"<p>{method_doc['description']}</p>\n"
        
        if method_doc["long_description"]:
            html += f"<p>{method_doc['long_description']}</p>\n"
        
        # Parameters
        if method_doc["parameters"]:
            html += "<h5>Parameters</h5>\n"
            html += "<table>\n"
            html += "<tr><th>Name</th><th>Type</th><th>Description</th><th>Default</th><th>Required</th></tr>\n"
            
            for param in method_doc["parameters"]:
                default_value = param["default"] if param["default"] is not None else "N/A"
                required = "Yes" if param["required"] else "No"
                html += f"<tr><td>{param['name']}</td><td><code>{param['type']}</code></td><td>{param['description']}</td><td>{default_value}</td><td>{required}</td></tr>\n"
            
            html += "</table>\n"
        
        # Return value
        html += "<div class='return'>\n"
        html += f"<h5>Returns</h5>\n"
        html += f"<p><strong>Type:</strong> <code>{method_doc['returns']['type']}</code></p>\n"
        
        if method_doc["returns"]["description"]:
            html += f"<p>{method_doc['returns']['description']}</p>\n"
        
        html += "</div>\n"
        
        # Examples
        if method_doc["examples"]:
            html += "<h5>Examples</h5>\n"
            for example in method_doc["examples"]:
                html += f"<pre><code>{example}</code></pre>\n"
        
        # Source info
        html += f"<p><small>Source: {method_doc['source_file']}:{method_doc['line_number']}</small></p>\n"
        
        html += "</div>\n"
        return html
    
    def _generate_function_html(self, function_name: str, function_doc: Dict[str, Any]) -> str:
        """Generate HTML documentation for a function"""
        # Reuse the method HTML generator
        return self._generate_method_html(function_name, function_doc)
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in readable format"""
        import datetime
        return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# Command-line interface if run directly
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate API documentation for the AI agent network")
    parser.add_argument("--output", default="docs/api", help="Output directory for documentation")
    parser.add_argument("--agents", default="agents", help="Path to agents module")
    parser.add_argument("--adapters", default="db_adapters", help="Path to adapters module")
    parser.add_argument("--crew", default="crew", help="Path to crew module")
    parser.add_argument("--format", choices=["json", "html", "both"], default="both", help="Output format")
    
    args = parser.parse_args()
    
    generator = APIDocumentation(args.output)
    
    if args.format in ["json", "both"]:
        generator.generate_agent_docs(args.agents)
        generator.generate_adapter_docs(args.adapters)
        generator.generate_crew_docs(args.crew)
    
    if args.format in ["html", "both"]:
        generator.generate_full_documentation()